/**
 * `@rpgjs/battle-kit/pure`: the pieces without a Pixi / CanvasEngine runtime
 * dependency, safe in Node, tests and servers.
 */
export { Clock, ease, type Ease } from "./clock";
export { ELEMENT_COLORS, elementColor } from "./colors";
export { popupMotion, digitMotion, popupLift, type PopupMotion } from "./popup";
export { aim, type Point } from "./aim";
export type { FxPresetName, PresetOptions } from "./types";
export type { BattleHookArgs } from "./hook-args";
export {
  visualEffectsOf,
  effectCues,
  runVisualEffect,
  type PlayableVisualEffect,
  type VisualEffects,
  type VisualEffectCue,
  type VisualEffectPlayback,
  type VisualEffectRunOptions,
} from "./visual-effect";
