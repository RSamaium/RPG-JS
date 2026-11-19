/**
 * Visual effects: one-shot particle effects (an explosion, a sparkle, a level up)
 * played at a position of the map. They are drawn by the `Fx` component of
 * `@canvasengine/presets`.
 */

/** Id of the component animation that plays one-shot visual effects. */
export const VISUAL_EFFECT_ANIMATION_ID = "rpg:visual-effect";

/** Options of a one-shot visual effect. Every field is plain data, sent to the clients. */
export interface VisualEffectOptions {
  /**
   * The resolved particle preset (the payload of a Studio Visual Effect). Without it,
   * the effect is the built-in preset named by `effect`.
   */
  preset?: Record<string, unknown>;
  /** How long the effect stays drawn, in ms. Without it, it ends with its particles. */
  duration?: number;
  scale?: number;
}
