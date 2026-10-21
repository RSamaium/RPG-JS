/**
 * Server side of the scripts: plugs them into an RPGJS game and binds the hooks of the engine to the signals scripts listen to.
 * Gameplay state lives on the server, so scripts run here in an MMORPG and in a standalone game alike.
 */
export { createRpgjsWorld, sharedPropsOf, SHARED_PREFIX, type RpgjsWorldOptions } from "./world";
