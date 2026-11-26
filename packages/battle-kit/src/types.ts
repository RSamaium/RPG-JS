type Presets = typeof import("@canvasengine/presets");

/**
 * The names of the built-in CanvasEngine effect presets
 * (`@canvasengine/presets`: attack, magic, epic, combat, status and aura
 * presets), usable as effect names. Any runtime (type only).
 *
 * @title FxPresetName
 * @example
 * ```ts
 * const slash: FxPresetName = "swordSlash";
 * fx.play(slash, target.x, target.y);
 * ```
 */
export type FxPresetName =
  | keyof Presets["ATTACK_FX_PRESETS"]
  | keyof Presets["MAGIC_FX_PRESETS"]
  | keyof Presets["EPIC_FX_PRESETS"]
  | keyof Presets["COMBAT_FX_PRESETS"]
  | keyof Presets["STATUS_FX_PRESETS"]
  | keyof Presets["AURA_FX_PRESETS"];

/**
 * Options to play an effect preset with `FxPlayer.play`, `FxPlayer.aimed` or
 * `FxPlayer.preset`. `flip`, `rotation` and `loop` are read by `play` only.
 * Any runtime (type only).
 *
 * @title PresetOptions
 * @example
 * ```ts
 * const options: PresetOptions = { color: "#7fdcff", scale: 1.5, intensity: 1.2, lifetime: 0.8 };
 * fx.play("iceShard", x, y, options);
 * ```
 */
export interface PresetOptions {
  /**
   * CSS colour the preset is recoloured with (`customizeFx`).
   *
   * @prop {string} [color]
   * @memberof PresetOptions
   */
  color?: string;
  /**
   * Size and speed multiplier. Default: 1.
   *
   * @prop {number} [scale]
   * @memberof PresetOptions
   */
  scale?: number;
  /**
   * Density multiplier passed to `customizeFx`: it scales the number of
   * particles each emitter spawns (burst, rate, particle cap). 1.5 is denser,
   * 0.5 is lighter. Default: 1.
   *
   * @prop {number} [intensity]
   * @memberof PresetOptions
   */
  intensity?: number;
  /**
   * Lifetime multiplier of the particles. Default: 1.
   *
   * @prop {number} [lifetime]
   * @memberof PresetOptions
   */
  lifetime?: number;
  /**
   * Mirror a directional preset (attack presets strike to the right).
   *
   * @prop {boolean} [flip]
   * @memberof PresetOptions
   */
  flip?: boolean;
  /**
   * Rotation of the effect (radians). Default: 0.
   *
   * @prop {number} [rotation]
   * @memberof PresetOptions
   */
  rotation?: number;
  /**
   * Play the preset in a loop until the stop function is called.
   *
   * @prop {boolean} [loop]
   * @memberof PresetOptions
   */
  loop?: boolean;
}
