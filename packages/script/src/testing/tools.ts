/**
 * The tools to write a script without the game: check, simulate, run tests written as data, describe the API.
 * They run against the in-memory world of `./world` and cost nothing but compute.
 */
import { compileProgram, CompileError, CompileErrors, type Limits, type Program } from "../core/interpreter";
import type { ListenFilter } from "../core/filter";
import { SignalRegistry, type ListenerReport } from "../core/signals";
import { apiInfo, describeApi, globalNames, hostFromApi } from "../core/api";
import { GAME_API_DESCRIPTION } from "../game/description";
import { GAME_API_IMPL } from "../game/impl";
import { SharedStore, SimWorld, type WorldInit } from "./world";
import { parseScript } from "../parse";

export interface Diagnostic { line: number; message: string }
export interface CheckResult {
  ok: boolean;
  diagnostics: Diagnostic[];
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
const strip = (m: string) => m.replace(/^line \S+: /, "");

export interface CheckOptions { requiredExports?: string[] }
export function checkScript(source: string, catalog?: Record<string, string[]>, options: CheckOptions = {}): CheckResult {
  const empty = { exports: [], handlers: [], listeners: [], events: [], refs: [], permissions: [], shared: [] as CheckResult["shared"] };
  let ast;
  try { ast = parseScript(source); } catch (e: any) {
    return { ok: false, diagnostics: [{ line: e.loc?.line ?? 0, message: `syntax error: ${strip(String(e.message))}` }], ...empty };
  }
  try {
    const program = compileProgram(ast, globalNames(GAME_API_DESCRIPTION), apiInfo(GAME_API_DESCRIPTION, catalog));
    const missing = (options.requiredExports ?? []).filter((n) => !program.exported.has(n));
    if (missing.length) return { ok: false, diagnostics: missing.map((n) => ({ line: 0, message: `missing exported function "${n}": the request requires it, write export function ${n}(...) { ... }` })), ...empty };
    return {
      ok: true, diagnostics: [], program,
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

export interface RunSpec {
  call?: { fn: string; args?: unknown[] };
  event?: number;
  fire?: string;
  /** Emits a signal as the game would: only the listeners whose filter holds run, and the result says which. */
  emit?: { signal: string; payload?: unknown };
  world?: WorldInit & Record<string, any>;
  limits?: Limits;
}
export interface SimulateInput extends RunSpec { source: string; catalog?: Record<string, string[]>; requiredExports?: string[] }
export interface SimulateResult {
  ok: boolean;
  diagnostics?: Diagnostic[];
  value?: unknown;
  page?: number;
  steps?: number;
  /** With `emit`: what happened to each listener. */
  listeners?: ListenerReport[];
  effects: { block: string; params: unknown }[];
  state?: ReturnType<SimWorld["snapshot"]>;
  error?: string;
  uncovered?: Record<string, string>;
}

/** Runs one scenario against a compiled program. `cover` collects the lines that were executed. */
async function execute(program: Program, spec: RunSpec, cover: Set<number>): Promise<SimulateResult> {
  // an agent writes "shared": { "stock": 5 } in its world: those are preset values, not a store
  const init: any = { ...(spec.world ?? {}) };
  let presets = init.sharedValues;
  if (init.shared !== undefined && !(init.shared instanceof SharedStore)) {
    presets = { ...(presets ?? {}), ...(init.shared && typeof init.shared === "object" ? init.shared : {}) };
    delete init.shared;
  }
  const world = new SimWorld(init);
  world.shared.declare(program.shared);
  Object.assign(world.shared.values, presets ?? {});
  const host = hostFromApi(GAME_API_DESCRIPTION, GAME_API_IMPL, world);
  const limits = spec.limits ?? { steps: 20000, iterations: 100 };
  try {
    let value: unknown, page: number | undefined, steps: number | undefined;
    if (spec.call) ({ value, steps } = await program.call(spec.call.fn, spec.call.args ?? [], host, limits, cover));
    else if (spec.event !== undefined) ({ page, steps } = await program.runEvent(spec.event, host, limits, cover));
    else if (spec.fire) await program.fire(spec.fire, host, limits, cover);
    else if (spec.emit) {
      const registry = new SignalRegistry({ description: GAME_API_DESCRIPTION, impl: GAME_API_IMPL, limits });
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

export async function simulate(input: SimulateInput): Promise<SimulateResult> {
  const check = checkScript(input.source, input.catalog, { requiredExports: input.requiredExports });
  if (!check.ok || !check.program) return { ok: false, diagnostics: check.diagnostics, effects: [] };
  const cover = new Set<number>();
  const r = await execute(check.program, input, cover);
  return { ...r, uncovered: check.program.uncovered(cover) };
}

// ---------------------------------------------------------------- tests as data
export interface TestCase extends RunSpec {
  name: string;
  dice?: number[];
  choices?: number[];
  /** Expectations are plain data. Keys: returns, page, error, effects, effectsInclude, effectsExclude, texts, notifications,
   *  and paths like "player.gold", "player.items.potion", "shared.stock_potion", "state.reputation", "vars.x";
   *  a value is a number, text, boolean, null, or { min, max } for a range. */
  expect?: Record<string, unknown>;
}
export interface TestResult { name: string; pass: boolean | null; failures: string[]; result: SimulateResult }
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
  const names = r.effects.map((e) => e.block);
  for (const [k, want] of Object.entries(exp)) {
    if (k === "error") continue;
    if (k === "returns") { if (!same(r.value, want)) out.push(`returns ${JSON.stringify(r.value)}, expected ${JSON.stringify(want)}`); }
    else if (k === "page") { if (r.page !== want) out.push(`page ${r.page}, expected ${want}`); }
    else if (k === "effects") { if (!same(names, want)) out.push(`effects ${JSON.stringify(names)}, expected ${JSON.stringify(want)}`); }
    else if (k === "effectsInclude") { for (const b of want as string[]) if (!names.includes(b)) out.push(`expected an effect "${b}"`); }
    else if (k === "effectsExclude") { for (const b of want as string[]) if (names.includes(b)) out.push(`unexpected effect "${b}"`); }
    else if (k === "texts") { const got = r.effects.filter((e) => e.block === "show_text").map((e: any) => e.params.text); if (!same(got, want)) out.push(`texts ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`); }
    else if (k === "notifications") { const got = r.effects.filter((e) => e.block === "show_notification").map((e: any) => e.params.message); if (!same(got, want)) out.push(`notifications ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`); }
    else if (!KNOWN.has(k) && /^(player|shared|state|vars)\./.test(k)) {
      const got = atPath(r.state, k);
      if (!matches(got, want)) out.push(`${k} is ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
    } else out.push(`unknown expectation "${k}"`);
  }
  return out;
}

export async function runTests(source: string, tests: TestCase[], catalog?: Record<string, string[]>): Promise<TestsReport> {
  const check = checkScript(source, catalog);
  if (!check.ok || !check.program) return { ok: false, diagnostics: check.diagnostics, results: [], uncovered: {} };
  const cover = new Set<number>();
  const results: TestResult[] = [];
  for (const t of tests) {
    const result = await execute(check.program, { ...t, world: { ...(t.world ?? {}), dice: t.dice ?? t.world?.dice, choices: t.choices ?? t.world?.choices } }, cover);
    const failures = t.expect ? judge(t, result) : [];
    results.push({ name: t.name, pass: t.expect ? failures.length === 0 : null, failures, result });
  }
  return { ok: true, results, uncovered: check.program.uncovered(cover) };
}

export const describeGameApi = () => describeApi(GAME_API_DESCRIPTION);
