/**
 * `@rpgjs/battle-kit`: the client pieces every battle scene of RPGJS shares,
 * whatever its rules (`@rpgjs/turn-battle`, `@rpgjs/tactical-rpg`, your own):
 *
 * - presentation: a presentation clock, CanvasEngine effect presets and Visual
 *   Effects played in a battle scene, screen impacts, floating numbers;
 * - screen: the GUIs of the game hidden during a battle, the keyboard and
 *   gamepad controls of a battle GUI, the sound cues;
 * - hooks: the client hooks of the game modules.
 *
 * The server pieces are in `@rpgjs/battle-kit/server`, the runtime-free ones
 * in `@rpgjs/battle-kit/pure`.
 */
export * from "./pure";
export { FxPlayer } from "./fx";
export { ScreenEffects } from "./screen";
export { BattleClientHooks } from "./client/hooks";
export { hideGuisDuringBattle, modalGuiShown, MODAL_GUIS, type BattleScreenOptions } from "./client/guis";
export { battleControls, typingInTextField, type BattleControl, type BattleControlHandler, type BattleControlHandlers, type BattleExtraControl } from "./client/controls";
export { BattleCues, synthNoise, synthTone, type BattleCueSound, type SynthesizedCue } from "./client/cues";
