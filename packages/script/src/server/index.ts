/**
 * Server side of the scripts: plugs them into an RPGJS game and binds the hooks of the engine to the signals scripts listen to.
 * Gameplay state lives on the server, so scripts run here in an MMORPG and in a standalone game alike.
 */
import { createModule } from "@rpgjs/common";
import { scriptHooks } from "./hooks";
import { ScriptService, type ScriptServiceOptions } from "./service";

export { ScriptService, type ScriptServiceOptions, type ScriptSource, type ScriptError, type SignalContext } from "./service";
export { createRpgjsWorld, sharedPropsOf, SHARED_PREFIX, type RpgjsWorldOptions } from "./world";
export { scriptHooks } from "./hooks";

/**
 * Plugs scripts into the server of a game: the hooks of RPGJS emit the signals scripts listen to (`player.joinMap`,
 * `player.leaveMap`, `player.levelUp`, `player.dead`, `event.action`, `event.touch`).
 *
 * ```ts
 * createServer({
 *   providers: [
 *     provideScripts({ scripts: [{ id: "chests", source: `on("event.action", { where: { "event.name": "chest" } }, () => { $player.gold += 10; });` }] }),
 *     provideServerModules([]),
 *   ],
 * })
 * ```
 *
 * Pass a `ScriptService` you made to install and uninstall scripts while the game runs; `inject(ScriptService)` gives it back.
 */
export function provideScripts(optionsOrService: ScriptServiceOptions | ScriptService = {}) {
  const service = optionsOrService instanceof ScriptService ? optionsOrService : new ScriptService(optionsOrService);
  // as a module, so that it adds to the modules of the game (`provideServerModules`) instead of replacing them
  return [{ provide: ScriptService, useValue: service }, ...createModule("Scripts", [{ server: scriptHooks(service) }])];
}
