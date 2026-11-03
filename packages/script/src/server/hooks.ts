/**
 * Binds the hooks of RPGJS to the signals of the game: each binding of the service (`bindings`) listens to its hook and emits its
 * signal. This is a module like any other (`player`, `event`… hooks), so it sees every player and every event without changing
 * any of them. Several bindings may listen to the same hook.
 */
import type { RpgServer } from "@rpgjs/server";
import type { HookScope, SignalBinding } from "./bindings";
import type { ScriptService } from "./service";

/**
 * The hooks of RPGJS that emit the signals of a `ScriptService`, one per binding. `provideScripts` adds it as a module; use it
 * directly only to build your own provider.
 *
 * @param service - The service that receives the signals, and whose `bindings` say which hooks to listen to.
 * @returns A server module.
 */
export function scriptHooks(service: ScriptService): RpgServer {
  const module: Partial<Record<HookScope, Record<string, (...args: unknown[]) => Promise<void>>>> = {};
  const byHook = new Map<string, SignalBinding[]>();
  // The signals of `background` bindings whose scripts still run, per player
  const running = new Set<string>();
  for (const binding of service.bindings) {
    const id = `${binding.scope}.${binding.hook}`;
    byHook.set(id, [...(byHook.get(id) ?? []), binding]);
  }
  for (const [id, bindings] of byHook) {
    const [scope, hook] = id.split(".") as [HookScope, string];
    (module[scope] ??= {})[hook] = async (...args: unknown[]) => {
      for (const binding of bindings) {
        // `map.tick` runs on every tick: nothing to compute when no script listens
        if (service.listeners(binding.signal).length === 0) continue;
        const emissions = await binding.emit(...args);
        for (const emission of [emissions ?? []].flat()) {
          if (!binding.background) {
            await service.emit(binding.signal, emission.payload, emission.context);
            continue;
          }
          const key = `${binding.signal}\0${emission.context.player.id}`;
          if (running.has(key)) continue;
          running.add(key);
          void service.emit(binding.signal, emission.payload, emission.context).finally(() => running.delete(key));
        }
      }
    };
  }
  return module as unknown as RpgServer;
}
