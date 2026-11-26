/**
 * The tools to write a script without the game: check, simulate, run tests written as data, describe the API.
 * They run against the in-memory world of `./world` and cost nothing but compute.
 */
import { compileProgram, CompileError, CompileErrors, type Limits, type Program } from "../core/interpreter";
import type { ListenFilter, SignalDesc } from "../core/filter";
import type { ApiDescription } from "../core/api";
import { SignalRegistry, type ListenerReport } from "../core/signals";
import { apiInfo, describeApi, globalNames, hostFromApi } from "../core/api";
import { GAME_API_DESCRIPTION } from "../game/description";
import { GAME_API_IMPL } from "../game/impl";
import { httpCatalog, withHttpDescription, withHttpImpl, type HttpConnectionOptions, type HttpHostAnswer, type HttpMethod, type HttpPort } from "../game/http";
import { SharedStore, SimWorld, type WorldInit } from "./world";
import { parseScript } from "../parse";

/** A problem found in a script, with its line (0 when it is about the script as a whole). */
export interface Diagnostic { line: number; message: string }
/** What checking a script found: whether it is valid, why not, and what it declares (exports, listeners, events, references, permissions, shared properties). */
export interface CheckResult {
  ok: boolean;
  diagnostics: Diagnostic[];
  /** What is valid but likely wrong (a listener of map.tick without every, a follow nothing stops…). They do not refuse the script. */
  warnings: Diagnostic[];
  exports: string[];
  handlers: string[];
  /** What the script listens to: the signal and the filter of each listener. */
  listeners: { signal: string; filter?: ListenFilter }[];
  events: { name?: string; pages: number }[];
  refs: { function: string; id: string; line: number }[];
  permissions: string[];
  shared: { name: string; initial: unknown; client: boolean; persist: boolean }[];
  program?: Program;
}
/** The world of a simulation, as an agent writes it: `shared` may be plain values (`{ stock: 5 }`) as well as a store. */
export type SimulatedWorld = Omit<WorldInit, "shared"> & { shared?: SharedStore | Record<string, unknown> };

/** The signals a module adds to the ones of the game (the `signals` option of `ScriptService`), by name. */
export type ModuleSignals = Record<string, SignalDesc>;

/** The API of the game, with the signals of the modules a game uses, and `$http` when the host declares connections. */
const descriptionWith = (signals?: ModuleSignals, connections?: Record<string, HttpConnectionOptions>): ApiDescription =>
  withHttpDescription(signals ? { ...GAME_API_DESCRIPTION, signals: { ...GAME_API_DESCRIPTION.signals, ...signals } } : GAME_API_DESCRIPTION, connections);

/**
 * A fake answer of a connection, for `simulate` and `runTests`: nothing touches the network. `methods` are the methods the connection
 * allows (`["GET"]` when not given); `json` is answered as JSON, `text` as text, `error` as an error code of the host.
 */
export interface SimHttpAnswer { status?: number; json?: unknown; text?: string; error?: string; methods?: HttpMethod[] }
/** The connections of a simulation, by name, with what each answers. */
export type SimHttp = Record<string, SimHttpAnswer>;

const connectionsOf = (http?: SimHttp): Record<string, HttpConnectionOptions> | undefined =>
  http ? Object.fromEntries(Object.entries(http).map(([name, fake]) => [name, fake.methods ? { methods: fake.methods } : {}])) : undefined;

/** The network of a simulation: each request that reaches it is an `http` effect, and gets the fake answer of its connection. */
function simHttpPort(http: SimHttp, world: SimWorld, signal: string | undefined, limits: Limits): HttpPort {
  return {
    connections: connectionsOf(http)!,
    signal,
    limits,
    async send(request): Promise<HttpHostAnswer> {
      world.effects.push({ name: "http", params: JSON.parse(JSON.stringify(request)) });
      const fake = http[request.connection] ?? {};
      if (fake.error !== undefined) return { status: fake.status ?? 0, error: fake.error };
      if (fake.json !== undefined) return { status: fake.status ?? 200, body: JSON.stringify(fake.json), contentType: "application/json" };
      return { status: fake.status ?? 200, body: fake.text ?? "", contentType: "text/plain" };
    },
  };
}

const strip = (m: string) => m.replace(/^line \S+: /, "");

/** The calls that wait for something (a player, a battle, time): in a listener of map.tick they hold the ticks of the player. */
const WAITING_CALLS = new Set(["showText", "showChoices", "wait", "startBattle"]);
/** The calls that each make one more thing of a limited number. */
const MAKING_CALLS = new Set(["createDynamicEvent", "spawnEnemy", "createShape", "attachShape", "startTimer"]);
const LOOPS = new Set(["ForStatement", "ForInStatement", "ForOfStatement", "WhileStatement", "DoWhileStatement"]);

/** The name a call is made with: `wait` of wait(...), `showText` of $player.showText(...). */
const calledName = (node: any): string | undefined =>
  node.callee?.type === "Identifier" ? node.callee.name : node.callee?.type === "MemberExpression" && !node.callee.computed ? node.callee.property?.name : undefined;

/** Walks a tree, giving each node with the nodes above it. */
function walk(node: any, visit: (node: any, above: any[]) => void, above: any[] = []): void {
  if (!node || typeof node.type !== "string") return;
  visit(node, above);
  for (const [key, value] of Object.entries(node)) {
    if (key === "loc" || key === "start" || key === "end") continue;
    if (Array.isArray(value)) for (const child of value) walk(child, visit, [...above, node]);
    else if (value && typeof value === "object") walk(value, visit, [...above, node]);
  }
}

/**
 * What is valid in a script but likely wrong, with the line: a listener of `map.tick` without `every` (it runs about 60 times a
 * second per player) or that waits, something made in a loop, an event that follows or flees and that nothing stops, a player
 * whose moves are taken and never given back.
 */
export function scriptWarnings(ast: any): Diagnostic[] {
  const warnings: Diagnostic[] = [];
  const lineOf = (node: any) => node?.loc?.start?.line ?? 0;
  let stopsEvents = false, givesMovesBack = false;
  const followers: any[] = [], moveTakers: any[] = [];
  walk(ast, (node, above) => {
    if (node.type === "CallExpression") {
      const name = calledName(node);
      if (name === "on" && node.callee.type === "Identifier" && node.arguments[0]?.type === "Literal" && node.arguments[0].value === "map.tick") {
        const filter = node.arguments.length > 2 ? node.arguments[1] : undefined;
        const hasEvery = filter?.type === "ObjectExpression" && filter.properties.some((p: any) => (p.key?.name ?? p.key?.value) === "every");
        if (!hasEvery) warnings.push({ line: lineOf(node), message: 'on("map.tick") runs about 60 times a second for each player: add { every: 0.5 } (or more) unless it must run on every tick' });
        walk(node.arguments[node.arguments.length - 1], (inner) => {
          if (inner.type === "CallExpression" && WAITING_CALLS.has(calledName(inner) ?? "")) {
            warnings.push({ line: lineOf(inner), message: `${calledName(inner)}() waits inside a listener of map.tick: the ticks of the player are skipped until it is done. Start it from another signal, or with a timer` });
          }
        });
      }
      if (name && MAKING_CALLS.has(name) && above.some((n) => LOOPS.has(n.type))) {
        warnings.push({ line: lineOf(node), message: `${name}() in a loop makes one more each turn: a map holds 50 events and 50 zones of scripts, a player 20 timers` });
      }
      if (name === "followPlayer" || name === "fleePlayer") followers.push(node);
      if (name === "stopEvent" || name === "moveEvent" || name === "teleportEvent") stopsEvents = true;
    }
    if (node.type === "AssignmentExpression" && node.left?.type === "MemberExpression" && node.left.property?.name === "canMove") {
      if (node.right?.type === "Literal" && node.right.value === false) moveTakers.push(node);
      else givesMovesBack = true;
    }
  });
  if (!stopsEvents) for (const node of followers) warnings.push({ line: lineOf(node), message: `${calledName(node)}() is never stopped in this script: the event goes on until the player leaves the map. Call $map.stopEvent(id) when it is over` });
  if (!givesMovesBack) for (const node of moveTakers) warnings.push({ line: lineOf(node), message: "$player.canMove = false is never set back to true in this script: the player keeps no moves" });
  return warnings.sort((a, b) => a.line - b.line);
}

/**
 * Options of `checkScript`: the exported functions the request requires, which make the check fail when missing, and the signals
 * of the modules a game uses (a signal of a module is accepted only when it is given here).
 */
export interface CheckOptions {
  requiredExports?: string[]; signals?: ModuleSignals;
  /** The connections the host declares for `$http`: without them, `$http` does not exist. */
  http?: { connections: Record<string, HttpConnectionOptions> };
}
/**
 * Checks a script without running it: parses it, compiles it against the API, and reports what it declares. Free to call, so it can
 * be called after every edit.
 *
 * @param source - The text of the script.
 * @param catalog - The ids a reference may take, by kind (`{ item: ["potion"] }`). A kind that is not given is not checked.
 * @param options - See `CheckOptions`.
 * @returns `ok`, the diagnostics with their lines (and what is available for an unknown name), and what the script declares.
 * @example
 * ```ts
 * const check = checkScript(`on("player.levelUp", () => { $player.gold += 5; });`)
 * check.ok        // true
 * check.listeners // [{ signal: "player.levelUp", filter: undefined }]
 * ```
 */
export function checkScript(source: string, catalog?: Record<string, string[]>, options: CheckOptions = {}): CheckResult {
  const empty = { warnings: [] as Diagnostic[], exports: [], handlers: [], listeners: [], events: [], refs: [], permissions: [], shared: [] as CheckResult["shared"] };
  let ast;
  try { ast = parseScript(source); } catch (e: any) {
    return { ok: false, diagnostics: [{ line: e.loc?.line ?? 0, message: `syntax error: ${strip(String(e.message))}` }], ...empty };
  }
  try {
    const description = descriptionWith(options.signals, options.http?.connections);
    const http = httpCatalog(options.http?.connections);
    const program = compileProgram(ast, globalNames(description), apiInfo(description, catalog || Object.keys(http).length ? { ...catalog, ...http } : undefined, { checkArguments: true }));
    const missing = (options.requiredExports ?? []).filter((n) => !program.exported.has(n));
    if (missing.length) return { ok: false, diagnostics: missing.map((n) => ({ line: 0, message: `missing exported function "${n}": the request requires it, write export function ${n}(...) { ... }` })), ...empty };
    return {
      ok: true, diagnostics: [], warnings: scriptWarnings(ast), program,
      exports: [...program.exported], handlers: program.handlers.map((h) => h.event),
      listeners: program.handlers.map((h) => ({ signal: h.event, filter: h.filter })),
      events: program.events.map((e) => ({ name: e.name, pages: e.pages.length })),
      refs: program.refs, permissions: [...program.permissions].sort(), shared: program.shared,
    };
  } catch (e) {
    const errs = e instanceof CompileErrors ? e.errors : e instanceof CompileError ? [e] : null;
    if (!errs) throw e;
    return { ok: false, diagnostics: errs.map((x) => ({ line: x.line, message: strip(x.message) })), ...empty };
  }
}

/** What to run in a simulation: a function (`call`), an event page, the handlers of a signal bypassing their filters (`fire`) or a signal as the game emits it (`emit`), in a world. */
export interface RunSpec {
  call?: { fn: string; args?: unknown[] };
  event?: number;
  fire?: string;
  /** Emits a signal as the game would: only the listeners whose filter holds run, and the result says which. */
  emit?: { signal: string; payload?: unknown };
  world?: SimulatedWorld;
  limits?: Limits;
  /** The signals of the modules the game uses, for `emit` and for the check of the script. */
  signals?: ModuleSignals;
  /** The connections of `$http`, with their fake answers: `{ meteo_api: { status: 200, json: { summary: "sunny" } } }`. */
  http?: SimHttp;
}
/** A simulation: the script, and what to run. */
export interface SimulateInput extends RunSpec { source: string; catalog?: Record<string, string[]>; requiredExports?: string[] }
/** What a simulation did: the value it returned, the effects in order, the final state, which listeners a signal reached, and the lines nothing ran. */
export interface SimulateResult {
  ok: boolean;
  diagnostics?: Diagnostic[];
  value?: unknown;
  page?: number;
  steps?: number;
  /** With `emit`: what happened to each listener. */
  listeners?: ListenerReport[];
  effects: { name: string; params: unknown }[];
  state?: ReturnType<SimWorld["snapshot"]>;
  error?: string;
  uncovered?: Record<string, string>;
}

/** Runs one scenario against a compiled program. `cover` collects the lines that were executed. */
async function execute(program: Program, spec: RunSpec, cover: Set<number>): Promise<SimulateResult> {
  // an agent writes "shared": { "stock": 5 } in its world: those are preset values, not a store
  const init: WorldInit & { shared?: unknown } = { ...(spec.world ?? {}) } as WorldInit;
  let presets = init.sharedValues;
  if (init.shared !== undefined && !(init.shared instanceof SharedStore)) {
    presets = { ...(presets ?? {}), ...(init.shared && typeof init.shared === "object" ? init.shared : {}) };
    delete init.shared;
  }
  const world = new SimWorld(init);
  world.shared.declare(program.shared);
  world.declarePlayerShared(program.shared);
  Object.assign(world.shared.values, presets ?? {});
  const description = descriptionWith(spec.signals, connectionsOf(spec.http));
  const impl = spec.http ? withHttpImpl(GAME_API_IMPL) : GAME_API_IMPL;
  const host = hostFromApi(description, impl, world);
  const limits = spec.limits ?? { steps: 20000, iterations: 100 };
  if (spec.http) world.http = simHttpPort(spec.http, world, spec.emit?.signal ?? spec.fire, limits);
  try {
    let value: unknown, page: number | undefined, steps: number | undefined;
    if (spec.call) ({ value, steps } = await program.call(spec.call.fn, spec.call.args ?? [], host, limits, cover));
    else if (spec.event !== undefined) ({ page, steps } = await program.runEvent(spec.event, host, limits, cover));
    else if (spec.fire) await program.fire(spec.fire, host, limits, cover);
    else if (spec.emit) {
      const registry = new SignalRegistry({ description, impl, limits });
      registry.install("script", program);
      world.hook = (spec.emit.payload && typeof spec.emit.payload === "object" ? spec.emit.payload : {}) as Record<string, unknown>;
      const report = await registry.emit(spec.emit.signal, spec.emit.payload ?? {}, () => world);
      return { ok: true, listeners: report.listeners, effects: world.effects, state: world.snapshot() };
    }
    return { ok: true, value, page, steps, effects: world.effects, state: world.snapshot() };
  } catch (e: any) {
    return { ok: false, error: `${e.constructor.name}: ${e.message}`, effects: world.effects, state: world.snapshot() };
  }
}

/**
 * Runs a script in an in-memory world and says what it did. Nothing of a game is needed.
 *
 * @param input - The script and what to run (see `RunSpec`).
 * @returns The result: `ok`, the value, the effects (what the script asked the game to do, in order), the final state of the
 * player, the shared properties and `$state`, and the `uncovered` lines.
 * @example
 * ```ts
 * const result = await simulate({
 *   source: `export function buy() { $player.gold -= 10; $player.addItem(Item("potion")); }`,
 *   call: { fn: "buy" },
 *   world: { player: { gold: 50 } },
 * })
 * result.state?.player.gold // 40
 * ```
 */
export async function simulate(input: SimulateInput): Promise<SimulateResult> {
  const connections = connectionsOf(input.http);
  const check = checkScript(input.source, input.catalog, { requiredExports: input.requiredExports, signals: input.signals, http: connections ? { connections } : undefined });
  if (!check.ok || !check.program) return { ok: false, diagnostics: check.diagnostics, effects: [] };
  const cover = new Set<number>();
  const r = await execute(check.program, input, cover);
  return { ...r, uncovered: check.program.uncovered(cover) };
}

// ---------------------------------------------------------------- tests as data
/** A test written as data: what to run (a `RunSpec`), what the dice and the choices answer, and what is expected. */
export interface TestCase extends RunSpec {
  name: string;
  dice?: number[];
  choices?: number[];
  /** Expectations are plain data. Keys: returns, page, error, effects, effectsInclude, effectsExclude, texts, notifications,
   *  and paths like "player.gold", "player.hp", "player.items.potion", "shared.stock_potion", "state.reputation", "vars.x",
   *  "events.guard.x", "events.guard.moving";
   *  a value is a number, text, boolean, null, or { min, max } for a range. */
  expect?: Record<string, unknown>;
}
/** The outcome of a test: whether it passed (`null` when it expected nothing), why not, and the whole simulation. */
export interface TestResult { name: string; pass: boolean | null; failures: string[]; result: SimulateResult }
/** The outcome of a list of tests, with the lines none of them ran. */
export interface TestsReport { ok: boolean; diagnostics?: Diagnostic[]; results: TestResult[]; uncovered: Record<string, string> }

const KNOWN = new Set(["returns", "page", "error", "effects", "effectsInclude", "effectsExclude", "texts", "notifications"]);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function atPath(snapshot: any, path: string): unknown {
  let cur = snapshot;
  for (const k of path.split(".")) cur = cur?.[k];
  return cur === undefined && /^player\.items\./.test(path) ? 0 : cur;
}
function matches(actual: unknown, want: unknown): boolean {
  if (want && typeof want === "object" && !Array.isArray(want) && ("min" in (want as any) || "max" in (want as any))) {
    const w = want as { min?: number; max?: number };
    return typeof actual === "number" && (w.min === undefined || actual >= w.min) && (w.max === undefined || actual <= w.max);
  }
  return same(actual, want);
}
function judge(t: TestCase, r: SimulateResult): string[] {
  const out: string[] = [];
  const exp = t.expect ?? {};
  if (exp.error !== undefined) {
    if (r.ok || !String(r.error).includes(String(exp.error))) out.push(`expected the error "${exp.error}", got ${r.ok ? "no error" : r.error}`);
  } else if (!r.ok) out.push(`the script failed: ${r.error ?? JSON.stringify(r.diagnostics)}`);
  if (!r.ok) return out;
  const names = r.effects.map((e) => e.name);
  for (const [k, want] of Object.entries(exp)) {
    if (k === "error") continue;
    if (k === "returns") { if (!same(r.value, want)) out.push(`returns ${JSON.stringify(r.value)}, expected ${JSON.stringify(want)}`); }
    else if (k === "page") { if (r.page !== want) out.push(`page ${r.page}, expected ${want}`); }
    else if (k === "effects") { if (!same(names, want)) out.push(`effects ${JSON.stringify(names)}, expected ${JSON.stringify(want)}`); }
    else if (k === "effectsInclude") { for (const b of want as string[]) if (!names.includes(b)) out.push(`expected an effect "${b}"`); }
    else if (k === "effectsExclude") { for (const b of want as string[]) if (names.includes(b)) out.push(`unexpected effect "${b}"`); }
    else if (k === "texts") { const got = r.effects.filter((e) => e.name === "showText").map((e: any) => e.params.text); if (!same(got, want)) out.push(`texts ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`); }
    else if (k === "notifications") { const got = r.effects.filter((e) => e.name === "showNotification").map((e: any) => e.params.message); if (!same(got, want)) out.push(`notifications ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`); }
    else if (!KNOWN.has(k) && /^(player|shared|state|vars|events)\./.test(k)) {
      const got = atPath(r.state, k);
      if (!matches(got, want)) out.push(`${k} is ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
    } else out.push(`unknown expectation "${k}"`);
  }
  return out;
}

/**
 * Runs tests written as data against a script, and reports which passed and which lines no test ran.
 *
 * @param source - The text of the script.
 * @param tests - The tests (see `TestCase`).
 * @param catalog - The ids a reference may take, by kind.
 * @param signals - The signals of the modules the game uses.
 * @example
 * ```ts
 * const report = await runTests(source, [
 *   { name: "buys", call: { fn: "buy" }, world: { player: { gold: 50 } }, expect: { "player.gold": 40, "player.items.potion": 1 } },
 * ])
 * ```
 */
export async function runTests(source: string, tests: TestCase[], catalog?: Record<string, string[]>, signals?: ModuleSignals): Promise<TestsReport> {
  // the connections of every test: a script is checked once, against all of them
  const connections = connectionsOf(Object.assign({}, ...tests.map((t) => t.http ?? {})));
  const check = checkScript(source, catalog, { signals, http: tests.some((t) => t.http) && connections ? { connections } : undefined });
  if (!check.ok || !check.program) return { ok: false, diagnostics: check.diagnostics, results: [], uncovered: {} };
  const cover = new Set<number>();
  const results: TestResult[] = [];
  for (const t of tests) {
    const result = await execute(check.program, { ...t, signals: t.signals ?? signals, world: { ...(t.world ?? {}), dice: t.dice ?? t.world?.dice, choices: t.choices ?? t.world?.choices } }, cover);
    const failures = t.expect ? judge(t, result) : [];
    results.push({ name: t.name, pass: t.expect ? failures.length === 0 : null, failures, result });
  }
  return { ok: true, results, uncovered: check.program.uncovered(cover) };
}

/**
 * The API of scripts in a game as TypeScript declarations, with its signals: what an agent reads before writing a script.
 *
 * @param signals - The signals of the modules the game uses, listed with the ones of the game.
 * @param options - `http`: the connections the host declares; `$http` is described only with them.
 * @returns Declarations, as text.
 */
export const describeGameApi = (signals?: ModuleSignals, options: { http?: { connections: Record<string, HttpConnectionOptions> } } = {}) =>
  describeApi(descriptionWith(signals, options.http?.connections));
