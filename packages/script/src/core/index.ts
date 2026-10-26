/**
 * The interpreter of scripts, free of the engine and of the parser: a tree goes in, closures come out, and nothing is ever
 * evaluated as JavaScript. It imports no `@rpgjs/*` package, so it runs in Node, in a Worker and in a browser.
 *
 * It also carries the game API of scripts (`GAME_API_DESCRIPTION`, `GAME_API_IMPL`), written once over the port `ScriptWorld`
 * that each environment (the game, a simulation) provides.
 */
export * from "./interpreter";
export * from "./api";
export * from "./filter";
export * from "./signals";
export { GAME_API_DESCRIPTION } from "../game/description";
export { GAME_SIGNALS } from "../game/signals";
export {
  GAME_API_IMPL,
  type Choice,
  type EventOptions,
  type EventSnapshot,
  type LightingTransition,
  MAX_SCRIPT_EVENTS,
  MAX_SCRIPT_SHAPES,
  type MapPort,
  type PlayerSnapshot,
  type ShakeOptions,
  type ShapeOptions,
  type ShapeSnapshot,
  type SoundOptions,
  type DialogOptions,
  type ItemSnapshot,
  type NotificationOptions,
  type PlayerPort,
  type ScriptWorld,
  type VariableValue,
} from "../game/impl";
