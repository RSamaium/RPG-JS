type Presets = typeof import("@canvasengine/presets");

/** CanvasEngine effect presets (`@canvasengine/presets`), usable as effect names. */
export type FxPresetName =
  | keyof Presets["ATTACK_FX_PRESETS"]
  | keyof Presets["MAGIC_FX_PRESETS"]
  | keyof Presets["EPIC_FX_PRESETS"]
  | keyof Presets["COMBAT_FX_PRESETS"]
  | keyof Presets["STATUS_FX_PRESETS"]
  | keyof Presets["AURA_FX_PRESETS"];

/** Options to play a preset. */
export interface PresetOptions {
  /** CSS colour (`customizeFx` recolour). */
  color?: string;
  /** Size (and speed) multiplier. */
  scale?: number;
  intensity?: number;
  /** Lifetime multiplier. */
  lifetime?: number;
  /** Mirror a directional preset (attack presets strike to the right). */
  flip?: boolean;
  rotation?: number;
  loop?: boolean;
}
