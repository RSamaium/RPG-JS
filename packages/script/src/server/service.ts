/**
 * The scripts of a game, on its server: they are compiled when they are installed, and run when a signal is emitted. A script
 * that is refused (it does not parse, it uses what does not exist, it listens to a signal the game does not have) is reported and
 * left out: it never stops the others, and never the game.
 */
import type { RpgEvent, RpgMap, RpgPlayer, RpgPlayerRoom } from "@rpgjs/server";
import { apiInfo, globalNames, type ApiDescription } from "../core/api";
import type { SignalDesc } from "../core/filter";
import { CompileError, CompileErrors, compileProgram, type AstNode, type Limits, type Program } from "../core/interpreter";
import { SignalRegistry, type EmitReport } from "../core/signals";
import { GAME_API_DESCRIPTION } from "../game/description";
import { GAME_API_IMPL } from "../game/impl";
import { httpCatalog, withHttpDescription, withHttpImpl, type HttpConnectionOptions, type HttpHostAnswer, type HttpPort, type HttpRequest } from "../game/http";
import { parseScript } from "../parse";
import { DEFAULT_SIGNAL_BINDINGS, type SignalBinding } from "./bindings";
import { createRpgjsWorld } from "./world";

/**
 * Where the `$state` of the scripts is kept between two starts of the server: one record of plain data per script id. The game
 * gives one (a file, a database, a key-value store); without it `$state` lives in memory and is lost when the server stops.
 *
 * @example
 * ```ts
 * import { readFile, writeFile } from "node:fs/promises";
 * const stateStore: ScriptStateStore = {
 *   load: async (script) => JSON.parse(await readFile(`state/${encodeURIComponent(script)}.json`, "utf8").catch(() => "{}")),
 *   save: (script, data) => writeFile(`state/${encodeURIComponent(script)}.json`, JSON.stringify(data)),
 * };
 * provideScripts({ stateStore, scripts })
 * ```
 */
export interface ScriptStateStore {
  load(script: string): Record<string, unknown> | undefined | null | Promise<Record<string, unknown> | undefined | null>;
  save(script: string, data: Record<string, unknown>): void | Promise<void>;
}

/** A line a script wrote with `log(...)`. */
export interface ScriptLog { script: string; message: string; at: number }
/** The most lines `ScriptService.logs` keeps: the oldest go first. */
export const MAX_SCRIPT_LOGS = 200;

/** A script given to the game: its text, or the tree an editor already computed from it. The id and the version name it. */
export type ScriptSource = { id: string; version?: number } & ({ source: string; tree?: undefined } | { tree: AstNode; source?: undefined });

/** What the transport of the host knows of a request: the script and the player it runs for, when to stop, how much to read. */
export interface HttpSendContext {
  /** The id of the script that asks. */
  script: string;
  /** The player of the signal: for per-player quotas and logs. */
  player: RpgPlayer;
  /** Aborted when the script stops waiting (`httpTimeout`). */
  signal: AbortSignal;
  /** Characters of the body at most: a longer answer gives `too_large` to the script, so the transport may stop reading there. */
  maxBytes: number;
}

/**
 * The network of the scripts, owned by the host. `@rpgjs/script` never does networking: it checks each request of `$http.request`
 * (a declared connection, a method it allows, a path that stays in it, a flat query, a plain body, the budget) and gives it to `send`.
 * The host resolves the connection to its base URL, adds its secrets and headers, and applies its own rules (internal addresses,
 * redirects, quotas, logs). What `send` throws never reaches the script: it gets `{ ok: false, error: "network" }`, and the reason is
 * written to the console of the server.
 *
 * @example
 * ```ts
 * const http: HttpTransport = {
 *   connections: { meteo_api: { methods: ["GET"] } },
 *   async send(request, { signal, maxBytes }) {
 *     const url = new URL(request.path, "https://api.open-meteo.com");
 *     for (const [k, v] of Object.entries(request.query ?? {})) url.searchParams.set(k, String(v));
 *     const res = await fetch(url, { method: request.method, signal, redirect: "error" });
 *     return { status: res.status, body: await res.text(), contentType: res.headers.get("content-type") ?? "" };
 *   },
 * };
 * provideScripts({ scripts, http });
 * ```
 */
export interface HttpTransport {
  /** The connections scripts may use, by name. A script never sees more than the name. */
  connections: Record<string, HttpConnectionOptions>;
  send(request: HttpRequest, context: HttpSendContext): Promise<HttpHostAnswer>;
}

/** What a `ScriptService` starts with: the scripts to install, the signals a plugin adds, and the budget of each handler. */
export interface ScriptServiceOptions {
  /** The network of `$http`. Without it, `$http` does not exist and a script that uses it is refused. */
  http?: HttpTransport;
  scripts?: ScriptSource[];
  /** Signals a plugin adds to the ones of the game: scripts can listen to them and `emit` can send them. */
  signals?: Record<string, SignalDesc>;
  /** Hooks of RPGJS to turn into signals, in addition to the ones of the game. A binding that describes its signal adds it to the catalog. */
  bindings?: SignalBinding[];
  /** Budget of each handler. */
  limits?: Limits;
  /** Where `$state` is kept between two starts of the server. In memory when not given. */
  stateStore?: ScriptStateStore;
  /** Receives each line a script writes with `log(...)`, as well as `logs` keeps it. The console of the server when not given. */
  onLog?: (log: ScriptLog) => void;
}

/** Why a script was refused. */
export interface ScriptError { script: string; message: string }

/**
 * Where a signal happened: the player the scripts act for, and where they are. The room and the map are the ones of the player when not
 * given; a player in a gameplay room that is not a map has no map.
 */
export interface SignalContext { player: RpgPlayer; map?: RpgMap | null; room?: RpgPlayerRoom | null; event?: RpgEvent | null }

/**
 * The scripts of a game, on its server: installs them, says who listens to what, and emits signals. `provideScripts` makes one and
 * binds the hooks of RPGJS to it; make your own and pass it to `provideScripts` to install and uninstall scripts while the game
 * runs, or to emit the signals of a plugin.
 *
 * @example
 * ```ts
 * const scripts = new ScriptService({ signals: { "quests.start": { payload: { questId: { type: "string" } } } } })
 * scripts.install({ id: "quests", source: `on("quests.start", { where: { questId: "wolves" } }, () => { $player.showNotification("Go!"); });` })
 * await scripts.emit("quests.start", { questId: "wolves" }, { player })
 * ```
 */
export class ScriptService {
  /** The scripts that were refused, and why. */
  errors: ScriptError[] = [];
  readonly description: ApiDescription;
  /** The hooks that emit signals: the ones of the game, then the ones that were added. */
  readonly bindings: SignalBinding[];
  private registry: SignalRegistry;
  private readonly http?: HttpTransport;
  private readonly limits?: Limits;
  private states = new Map<string, Map<string, unknown>>();
  private readonly stateStore?: ScriptStateStore;
  private readonly onLog?: (log: ScriptLog) => void;
  /** The `$state` of the scripts that is still loading from the store. */
  private loading = new Map<string, Promise<void>>();
  /** The scripts whose `$state` changed since it was last saved. */
  private dirty = new Set<string>();
  private flushing: Promise<void> | undefined;
  /** The last lines the scripts wrote with `log(...)`, oldest first. */
  logs: ScriptLog[] = [];
  /** The failures already written to the console, so that a listener failing on every tick is reported once. */
  private reported = new Set<string>();

  constructor(options: ScriptServiceOptions = {}) {
    this.bindings = [...DEFAULT_SIGNAL_BINDINGS, ...(options.bindings ?? [])];
    const described = Object.fromEntries(this.bindings.flatMap((b) => (b.describe ? [[b.signal, b.describe]] : [])));
    this.http = options.http;
    this.limits = options.limits;
    this.description = withHttpDescription({ ...GAME_API_DESCRIPTION, signals: { ...GAME_API_DESCRIPTION.signals, ...described, ...options.signals } }, this.http?.connections);
    this.registry = new SignalRegistry({ description: this.description, impl: this.http ? withHttpImpl(GAME_API_IMPL) : GAME_API_IMPL, limits: options.limits });
    this.stateStore = options.stateStore;
    this.onLog = options.onLog;
    for (const script of options.scripts ?? []) this.install(script);
  }

  private compile(script: ScriptSource): Program {
    const tree = script.tree ?? parseScript(script.source);
    const catalog = httpCatalog(this.http?.connections);
    return compileProgram(tree, globalNames(this.description), apiInfo(this.description, Object.keys(catalog).length ? catalog : undefined));
  }

  /**
   * Installs a script, or replaces the one with the same id. A script that is refused is reported and not installed (the one it
   * would have replaced stays). Returns whether it is installed.
   */
  install(script: ScriptSource): boolean {
    try {
      this.registry.install(script.id, this.compile(script));
      this.loadState(script.id);
      this.errors = this.errors.filter((e) => e.script !== script.id);
      this.forgetReported(script.id);
      return true;
    } catch (error) {
      const message =
        error instanceof CompileErrors ? error.errors.map((e) => e.message).join("; ")
        : error instanceof CompileError ? error.message
        : error instanceof Error && "loc" in error ? `syntax error at line ${(error as any).loc?.line}: ${error.message}`
        : String(error);
      this.errors = [...this.errors.filter((e) => e.script !== script.id), { script: script.id, message }];
      console.error(`[script] "${script.id}" was refused: ${message}`);
      return false;
    }
  }

  uninstall(id: string): void {
    this.registry.uninstall(id);
    // with a store the state stays in memory too: a script installed again finds it, saved or not
    if (!this.stateStore) this.states.delete(id);
    this.forgetReported(id);
  }

  private forgetReported(script: string) {
    for (const key of this.reported) if (key.startsWith(`${script}\0`)) this.reported.delete(key);
  }

  has(id: string): boolean {
    return this.registry.has(id);
  }

  /** Who listens to a signal, in the order they run, with their filter. */
  listeners(signal: string) {
    return this.registry.listeners(signal);
  }

  /**
   * Emits a signal: the listeners whose filter holds run, for the player of the context. Never throws: a listener that fails is
   * reported (in the result, and once in the console until the script is installed again) and the next one runs.
   */
  async emit(signal: string, payload: unknown, context: SignalContext): Promise<EmitReport> {
    const hook = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    if (this.loading.size > 0) await Promise.all(this.loading.values());
    const report = await this.registry.emit(signal, payload, (script, program) =>
      this.worldOf(signal, script, program, context, hook),
    String(context.player?.id ?? ""));
    this.reportFailures(signal, report);
    return report;
  }

  /**
   * Emits a signal that takes a reply (its `reply` in the catalog), for a hook of the game that cannot wait: gives at once what the
   * first listener that did not wait returned, among the replies of the signal. The listeners that wait run afterwards, as observers;
   * their failures are reported like the ones of `emit`.
   */
  emitSync(signal: string, payload: unknown, context: SignalContext): string | undefined {
    const hook = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    const accepted = this.description.signals?.[signal]?.reply ?? [];
    // a $state that is still loading is read as it is: a hook that cannot wait does not wait for the store
    const { reply, report } = this.registry.emitSync(signal, payload, accepted, (script, program) =>
      this.worldOf(signal, script, program, context, hook),
    String(context.player?.id ?? ""));
    void report.then((done) => this.reportFailures(signal, done));
    return reply;
  }

  /** The world of one run of a listener: a new one each time, so `$http` counts the requests of this run only. */
  private worldOf(signal: string, script: string, program: Program, context: SignalContext, hook: Record<string, unknown>) {
    return createRpgjsWorld({
      ...context, shared: program.shared, hook, state: this.stateOf(script), emit: this.worldEmit, log: (message) => this.log(script, message),
      http: this.http ? this.httpPort(signal, script, context.player) : undefined,
    });
  }

  /** The network of a run: the transport of the host, for this script and this player. What it throws is logged, never given. */
  private httpPort(signal: string, script: string, player: RpgPlayer): HttpPort {
    const transport = this.http!;
    return {
      connections: transport.connections,
      signal,
      limits: this.limits,
      send: async (request, { timeout, maxBytes }) => {
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout> | undefined;
        const late = new Promise<HttpHostAnswer>((resolve) => {
          timer = setTimeout(() => { controller.abort(); resolve({ error: "timeout" }); }, timeout * 1000);
        });
        try {
          return await Promise.race([transport.send(request, { script, player, signal: controller.signal, maxBytes }), late]);
        } catch (error) {
          console.error(`[script] "${script}": the http transport failed for "${request.connection}" ${request.method} ${request.path}: ${error instanceof Error ? error.message : String(error)}`);
          return { error: "network" };
        } finally {
          clearTimeout(timer);
        }
      },
    };
  }

  /** What the world of a script emits (an event it walked arrives): a signal like the ones of the hooks. */
  private readonly worldEmit = (signal: string, payload: Record<string, unknown>, context: SignalContext) => {
    if (this.registry.listeners(signal).length > 0) void this.emit(signal, payload, context);
  };

  private reportFailures(signal: string, report: EmitReport) {
    for (const l of report.listeners) {
      if (!l.error) continue;
      const key = `${l.script}\0${signal}\0${l.error}`;
      if (this.reported.has(key)) continue;
      this.reported.add(key);
      console.error(`[script] "${l.script}" failed on "${signal}": ${l.error}`);
    }
  }

  private stateOf(script: string) {
    let data = this.states.get(script);
    if (!data) this.states.set(script, (data = new Map()));
    const store = data;
    return {
      get: (key: string) => store.get(key),
      set: (key: string, value: unknown) => {
        store.set(key, value);
        this.markDirty(script);
      },
    };
  }

  /** Reads the `$state` of a script from the store, once: what the script already set while it loaded wins. */
  private loadState(script: string) {
    if (!this.stateStore || this.states.has(script) || this.loading.has(script)) return;
    const loaded = (async () => {
      try {
        const saved = await this.stateStore!.load(script);
        const data = this.states.get(script) ?? new Map<string, unknown>();
        for (const [key, value] of Object.entries(saved ?? {})) if (!data.has(key)) data.set(key, value);
        this.states.set(script, data);
      } catch (error) {
        console.error(`[script] the state of "${script}" could not be loaded: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        this.loading.delete(script);
      }
    })();
    this.loading.set(script, loaded);
  }

  private markDirty(script: string) {
    if (!this.stateStore) return;
    this.dirty.add(script);
    // the changes of one turn are saved together
    if (!this.flushing) this.flushing = Promise.resolve().then(() => this.flushState());
  }

  /**
   * Saves now the `$state` that changed since it was last saved, and waits for the store. The service saves by itself after
   * each change; call it before the server stops.
   */
  async flushState(): Promise<void> {
    this.flushing = undefined;
    if (!this.stateStore) return;
    const scripts = [...this.dirty];
    this.dirty.clear();
    await Promise.all(scripts.map(async (script) => {
      try {
        await this.stateStore!.save(script, Object.fromEntries(this.states.get(script) ?? []));
      } catch (error) {
        console.error(`[script] the state of "${script}" could not be saved: ${error instanceof Error ? error.message : String(error)}`);
      }
    }));
  }

  /** Keeps a line a script wrote, and gives it to `onLog` or to the console. */
  private log(script: string, message: string) {
    const entry: ScriptLog = { script, message, at: Date.now() };
    this.logs.push(entry);
    if (this.logs.length > MAX_SCRIPT_LOGS) this.logs.splice(0, this.logs.length - MAX_SCRIPT_LOGS);
    if (this.onLog) this.onLog(entry);
    else console.log(`[script] "${script}": ${message}`);
  }
}
