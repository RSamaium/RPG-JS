/**
 * The scripts of a game, on its server: they are compiled when they are installed, and run when a signal is emitted. A script
 * that is refused (it does not parse, it uses what does not exist, it listens to a signal the game does not have) is reported and
 * left out: it never stops the others, and never the game.
 */
import type { RpgEvent, RpgMap, RpgPlayer } from "@rpgjs/server";
import { apiInfo, globalNames, type ApiDescription } from "../core/api";
import type { SignalDesc } from "../core/filter";
import { CompileError, CompileErrors, compileProgram, type AstNode, type Limits, type Program } from "../core/interpreter";
import { SignalRegistry, type EmitReport } from "../core/signals";
import { GAME_API_DESCRIPTION } from "../game/description";
import { GAME_API_IMPL } from "../game/impl";
import { parseScript } from "../parse";
import { createRpgjsWorld } from "./world";

/** A script given to the game: its text, or the tree an editor already computed from it. The id and the version name it. */
export type ScriptSource = { id: string; version?: number } & ({ source: string; tree?: undefined } | { tree: AstNode; source?: undefined });

/** What a `ScriptService` starts with: the scripts to install, the signals a plugin adds, and the budget of each handler. */
export interface ScriptServiceOptions {
  scripts?: ScriptSource[];
  /** Signals a plugin adds to the ones of the game: scripts can listen to them and `emit` can send them. */
  signals?: Record<string, SignalDesc>;
  /** Budget of each handler. */
  limits?: Limits;
}

/** Why a script was refused. */
export interface ScriptError { script: string; message: string }

/** Where a signal happened: the player the scripts act for, the map, and the event if there is one. */
export interface SignalContext { player: RpgPlayer; map: RpgMap; event?: RpgEvent | null }

/**
 * The scripts of a game, on its server: installs them, says who listens to what, and emits signals. `provideScripts` makes one and
 * binds the hooks of RPGJS to it; make your own and pass it to `provideScripts` to install and uninstall scripts while the game
 * runs, or to emit the signals of a plugin.
 *
 * @example
 * ```ts
 * const scripts = new ScriptService({ signals: { "quests.start": { payload: { questId: { type: "string" } } } } })
 * scripts.install({ id: "quests", source: `on("quests.start", { where: { questId: "wolves" } }, () => { notify("Go!"); });` })
 * await scripts.emit("quests.start", { questId: "wolves" }, { player, map })
 * ```
 */
export class ScriptService {
  /** The scripts that were refused, and why. */
  errors: ScriptError[] = [];
  readonly description: ApiDescription;
  private registry: SignalRegistry;
  private states = new Map<string, Map<string, unknown>>();

  constructor(options: ScriptServiceOptions = {}) {
    this.description = { ...GAME_API_DESCRIPTION, signals: { ...GAME_API_DESCRIPTION.signals, ...options.signals } };
    this.registry = new SignalRegistry({ description: this.description, impl: GAME_API_IMPL, limits: options.limits });
    for (const script of options.scripts ?? []) this.install(script);
  }

  private compile(script: ScriptSource): Program {
    const tree = script.tree ?? parseScript(script.source);
    return compileProgram(tree, globalNames(this.description), apiInfo(this.description));
  }

  /**
   * Installs a script, or replaces the one with the same id. A script that is refused is reported and not installed (the one it
   * would have replaced stays). Returns whether it is installed.
   */
  install(script: ScriptSource): boolean {
    try {
      this.registry.install(script.id, this.compile(script));
      this.errors = this.errors.filter((e) => e.script !== script.id);
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
    this.states.delete(id);
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
   * reported (in the result and in the console) and the next one runs.
   */
  async emit(signal: string, payload: unknown, context: SignalContext): Promise<EmitReport> {
    const hook = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    const report = await this.registry.emit(signal, payload, (script, program) =>
      createRpgjsWorld({ ...context, shared: program.shared, hook, state: this.stateOf(script) }),
    );
    for (const l of report.listeners) if (l.error) console.error(`[script] "${l.script}" failed on "${signal}": ${l.error}`);
    return report;
  }

  private stateOf(script: string) {
    let data = this.states.get(script);
    if (!data) this.states.set(script, (data = new Map()));
    const store = data;
    return { get: (key: string) => store.get(key), set: (key: string, value: unknown) => void store.set(key, value) };
  }
}
