/**
 * Maps the target-relative keys of a CanvasEngine FX preset to pixels.
 *
 * A preset is written from the caster at `(0, 0)`. An emitter (or a recipe) going to the target says so:
 * - `pathSpace: "target"`: its `path` keys are fractions of the caster → target line (`x` along it, `0` the caster,
 *   `1` the target; `y` across it), mapped to pixels when the effect is played;
 * - `at: "target"`: an emitter without `path` placed on the target (an impact, a cloud on the enemy).
 *
 * The runtime does not know these keys yet (https://github.com/RSamaium/CanvasEngine/issues/88):
 * `resolveTargetSpace` maps them to plain pixels before a preset is spawned. Remove it when the runtime takes a `target`.
 */

/** Distance to the target used when nothing else gives one: an editor preview, a map effect with no target. */
export const VISUAL_EFFECT_REFERENCE_DISTANCE = 200;

/** A plain FX preset object (`FxPreset` of `@canvasengine/presets`), kept loose so this file does not depend on it. */
export type VisualEffectPreset = { duration?: number; delay?: number; emitters: Record<string, unknown>[] };

export interface Point {
  x: number;
  y: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function mapPath(path: unknown, target: Point): unknown {
  if (!Array.isArray(path)) return path;
  return path.map((key) => {
    if (!isRecord(key)) return key;
    const u = typeof key["x"] === "number" ? key["x"] : 0;
    const v = typeof key["y"] === "number" ? key["y"] : 0;
    return { ...key, x: target.x * u - target.y * v, y: target.y * u + target.x * v };
  });
}

function resolveItem(item: unknown, target: Point): unknown {
  if (!isRecord(item)) return item;
  const { pathSpace, at, ...rest } = item;
  const resolved: Record<string, unknown> = { ...rest };
  if (pathSpace === "target") resolved["path"] = mapPath(rest["path"], target);
  if (at === "target") {
    const x = rest["x"];
    const y = rest["y"];
    resolved["x"] = target.x + (typeof x === "number" ? x : 0);
    resolved["y"] = target.y + (typeof y === "number" ? y : 0);
  }
  const emitters = rest["emitters"];
  if (Array.isArray(emitters)) resolved["emitters"] = emitters.map((child) => resolveItem(child, target));
  return resolved;
}

/**
 * Maps the target-relative keys of a preset to pixels, `target` being the target seen from the caster.
 * Temporary until https://github.com/RSamaium/CanvasEngine/issues/88.
 */
export function resolveTargetSpace<T extends VisualEffectPreset>(preset: T, target: Point = { x: VISUAL_EFFECT_REFERENCE_DISTANCE, y: 0 }): T {
  return { ...preset, emitters: preset.emitters.map((item) => resolveItem(item, target)) } as T;
}
