/**
 * The registry of listeners: scripts are installed, each declares the signals it listens to with `on(...)`, and the game emits
 * a signal with its payload. Listeners run in the order the scripts were installed. They **observe**: the payload they get
 * cannot be changed. A signal that takes a reply (`SignalDesc.reply`) is emitted with `emitSync`: the first listener that
 * returns one of its replies decides.
 */
import { hostFromApi, type ApiDescription, type ApiImpl } from "./api";
import { conditionFailure, whereFailure, type ListenFilter } from "./filter";
import type { Handler, Limits, Program } from "./interpreter";
import type { ScriptWorld } from "../game/impl";

/** What happened to one listener when a signal was emitted. */
export interface ListenerReport {
  script: string;
  /** Its filter held. */
  matched: boolean;
  /** Its handler ran to the end. */
  ran: boolean;
  /** Why the filter did not hold. */
  why?: string;
  /** Why the handler did not run to the end. */
  error?: string;
}
/** What happened to every listener a signal reached, in the order they ran. */
export interface EmitReport { listeners: ListenerReport[] }

/** What `emitSync` gives: the reply, at once, and the report once the listeners that wait are done too. */
export interface SyncEmitResult {
  /** What the first listener that replied returned, among the accepted replies. */
  reply?: string;
  /** The report of every listener, once the ones that wait have run as well. */
  report: Promise<EmitReport>;
}

/** What a registry needs: the API scripts run against, and the budget of each handler. */
export interface SignalRegistryOptions {
  description: ApiDescription;
  impl: ApiImpl<ScriptWorld>;
  /** Budget of each handler. */
  limits?: Limits;
}

const DEFAULT_LIMITS: Limits = { steps: 20000, iterations: 100 };

/** A copy of the payload that nothing can change. */
function frozen<T>(value: T): T {
  if (Array.isArray(value)) return Object.freeze(value.map(frozen)) as unknown as T;
  if (value && typeof value === "object") return Object.freeze(Object.fromEntries(Object.entries(value).map(([k, v]) => [k, frozen(v)]))) as T;
  return value;
}

/**
 * The scripts that are installed and what they listen to. The game emits a signal with its payload; the listeners whose filter
 * holds run, in the order the scripts were installed. Listeners only observe.
 *
 * @example
 * ```ts
 * const registry = new SignalRegistry({ description: GAME_API_DESCRIPTION, impl: GAME_API_IMPL })
 * registry.install("chests", program)
 * const report = await registry.emit("event.action", { event: { id: "chest-1", name: "chest" } }, (script) => worldOf(script))
 * ```
 */
export class SignalRegistry {
  private scripts = new Map<string, Program>();

  constructor(private options: SignalRegistryOptions) {}

  /** Installs a script. Installing again an id that is installed replaces it, and puts it last. */
  install(id: string, program: Program): void {
    this.scripts.delete(id);
    this.scripts.set(id, program);
  }

  uninstall(id: string): void {
    this.scripts.delete(id);
  }

  has(id: string): boolean {
    return this.scripts.has(id);
  }

  /** Who listens to a signal, in the order they will run, with the filter each declared. Nothing runs. */
  listeners(signal: string): { script: string; filter?: ListenFilter }[] {
    return [...this.scripts].flatMap(([script, program]) => program.handlers.filter((h) => h.event === signal).map((h) => ({ script, filter: h.filter })));
  }

  /** The signals somebody listens to, in the order they were first listened to. */
  signals(): string[] {
    return [...new Set([...this.scripts.values()].flatMap((program) => program.handlers.map((h) => h.event)))];
  }

  /**
   * Emits a signal: runs, in installation order, the listeners whose filter holds. A listener that fails is reported and the
   * next one runs. `worldFor` gives the world of a script (its player, its shared properties): called once per listener that is
   * reached.
   */
  async emit(signal: string, payload: unknown, worldFor: (script: string, program: Program, payload: unknown) => ScriptWorld): Promise<EmitReport> {
    const limits = this.options.limits ?? DEFAULT_LIMITS;
    const data = frozen(payload);
    const listeners: ListenerReport[] = [];
    for (const [script, program] of this.scripts) {
      for (const handler of program.handlers.filter((h: Handler) => h.event === signal)) {
        const report: ListenerReport = { script, matched: false, ran: false };
        listeners.push(report);
        const failure = whereFailure(payload, handler.filter?.where);
        if (failure) { report.why = failure; continue; }
        try {
          const world = worldFor(script, program, payload);
          const unmet = conditionFailure(handler.filter?.when, world.player);
          if (unmet) { report.why = unmet; continue; }
          report.matched = true;
          await program.run(handler, [data], hostFromApi(this.options.description, this.options.impl, world), limits);
          report.ran = true;
        } catch (error) {
          report.matched = true;
          report.error = error instanceof Error ? error.message : String(error);
        }
      }
    }
    return { listeners };
  }

  /**
   * Emits a signal that takes a reply, for a game that cannot wait (a projectile hitting something). The listeners that do not
   * wait run at once, in installation order: the first that returns one of `accepted` decides, the others still run. A listener
   * that waits (`wait`, `showText`) cannot reply: it runs afterwards, as an observer.
   */
  emitSync(signal: string, payload: unknown, accepted: readonly string[], worldFor: (script: string, program: Program, payload: unknown) => ScriptWorld): SyncEmitResult {
    const limits = this.options.limits ?? DEFAULT_LIMITS;
    const data = frozen(payload);
    const listeners: ListenerReport[] = [];
    const waiting: Array<() => Promise<void>> = [];
    let reply: string | undefined;
    for (const [script, program] of this.scripts) {
      for (const handler of program.handlers.filter((h: Handler) => h.event === signal)) {
        const report: ListenerReport = { script, matched: false, ran: false };
        listeners.push(report);
        const failure = whereFailure(payload, handler.filter?.where);
        if (failure) { report.why = failure; continue; }
        try {
          const world = worldFor(script, program, payload);
          const unmet = conditionFailure(handler.filter?.when, world.player);
          if (unmet) { report.why = unmet; continue; }
          report.matched = true;
          const host = hostFromApi(this.options.description, this.options.impl, world);
          const ran = program.runSync(handler, [data], host, limits);
          if (!ran) {
            waiting.push(async () => {
              try {
                await program.run(handler, [data], host, limits);
                report.ran = true;
              } catch (error) {
                report.error = error instanceof Error ? error.message : String(error);
              }
            });
            continue;
          }
          report.ran = true;
          if (reply === undefined && typeof ran.value === "string" && accepted.includes(ran.value)) reply = ran.value;
        } catch (error) {
          report.matched = true;
          report.error = error instanceof Error ? error.message : String(error);
        }
      }
    }
    const report = (async () => {
      for (const run of waiting) await run();
      return { listeners };
    })();
    return { reply, report };
  }
}
