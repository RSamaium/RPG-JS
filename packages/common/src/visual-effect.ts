/**
 * Visual effects: one-shot particle effects (an explosion, a sparkle, a level up)
 * played at a position of the map. They are drawn by the `Fx` component of
 * `@canvasengine/presets`.
 */

/** Id of the component animation that plays one-shot visual effects. */
export const VISUAL_EFFECT_ANIMATION_ID = "rpg:visual-effect";

/** A sound played on the timeline of a visual effect. */
export interface VisualEffectSound {
  /** Id of the sound, as `engine.playSound` reads it. */
  sound: string;
  /** When it plays, in ms from the start of the effect. Defaults to 0. */
  start?: number;
  /** From 0 to 1. Defaults to 1. */
  volume?: number;
}

/**
 * How a particle preset is tuned when it plays: the options of `customizeFx`
 * of `@canvasengine/presets`.
 */
export interface VisualEffectTuning {
  /** Main color, as `#rrggbb`. */
  color?: string;
  /** Strength: more particles, more alpha. 1 is the preset as written. */
  intensity?: number;
  sizeScale?: number;
  speedScale?: number;
}

/** Options of a one-shot visual effect. Every field is plain data, sent to the clients. */
export interface VisualEffectOptions extends VisualEffectTuning {
  /**
   * The resolved particle preset (the payload of a Studio Visual Effect). Without it,
   * the effect is the built-in preset named by `effect`.
   */
  preset?: Record<string, unknown>;
  /** How long the effect stays drawn, in ms. Without it, it ends with its particles. */
  duration?: number;
  scale?: number;
  /**
   * Where the effect goes, in map pixels: the emitters of the preset that follow
   * the caster → target line (`pathSpace: "target"`) or play on the target
   * (`at: "target"`) aim at it. Without it, they aim 200 px to the right.
   */
  target?: { x: number; y: number };
  /** Wait before the effect starts, in ms. */
  delay?: number;
  /** Sounds played with the effect, each at its `start` (after `delay`). */
  sounds?: VisualEffectSound[];
}
