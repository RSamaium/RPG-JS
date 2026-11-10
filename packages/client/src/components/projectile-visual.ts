import type { ClientProjectileSurface } from "../Game/ProjectileManager";

/**
 * Look of a projectile drawn by the standard projectile component, sent by the
 * server in `params`. Every field is optional.
 */
export interface ProjectileVisualParams {
  /** Spritesheet id drawn instead of a shape. Its `default` animation is played. */
  graphic?: string;
  /** Built-in shape used without a `graphic`. Defaults to `orb`. */
  shape?: "arrow" | "orb" | "bomb";
  /** Main color, as `#rrggbb` or a number. */
  color?: string | number;
  /** Highlight color (fletching, flash, sparks). */
  accentColor?: string | number;
  scale?: number;
  /** Point the projectile along its flight. Defaults to `true`. */
  rotate?: boolean;
  /** Turns per second, for a boomerang or a thrown axe. Replaces `rotate`. */
  spin?: number;
  /** Shadow on the ground under the projectile. Defaults to `true`. */
  shadow?: boolean;
  /** Ribbon following the projectile: `true`, or its color, width and length (in frames). */
  trail?: boolean | { color?: string | number; width?: number; length?: number };
  /** Particle preset of `@canvasengine/presets` attached to the flying projectile. */
  trailFx?: string;
  /**
   * Particle preset played on impact, replacing the drawn one. Give one name,
   * or one per surface.
   */
  impactFx?: string | Partial<Record<ClientProjectileSurface, string>>;
  /** Sound id played on impact. */
  impactSound?: string;
  /** Shake the map on impact: `true`, or the intensity. */
  shake?: boolean | number;
  /** How long the impact stays drawn, in ms. Defaults to 350. */
  impactDuration?: number;
}

/** Parse a `#rrggbb` string or a number into a color number. */
export function projectileColor(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^#?[0-9a-f]{6}$/i.test(value)) {
    return parseInt(value.replace("#", ""), 16);
  }
  return fallback;
}

/** Trail settings, or `null` when the projectile has no trail. */
export function projectileTrailOptions(
  trail: ProjectileVisualParams["trail"],
  color: number,
): { color: number; width: number; length: number } | null {
  if (!trail) return null;
  const options = typeof trail === "object" ? trail : {};
  return {
    color: projectileColor(options.color, color),
    width: Math.max(0.5, Number(options.width) || 3),
    length: Math.max(2, Math.round(Number(options.length) || 12)),
  };
}

/** Particle preset to play for an impact on `surface`, or `null` for the drawn impact. */
export function projectileImpactFx(
  impactFx: ProjectileVisualParams["impactFx"],
  surface: ClientProjectileSurface | undefined,
): string | null {
  if (typeof impactFx === "string") return impactFx || null;
  if (!impactFx || typeof impactFx !== "object") return null;
  return impactFx[surface ?? "target"] || null;
}

/**
 * Sparks of an impact. They are derived from the projectile id so every client
 * draws the same burst.
 */
export function projectileSparks(seed: string, count: number): Array<{ angle: number; speed: number; bright: boolean }> {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    state = Math.imul(state ^ seed.charCodeAt(i), 16777619) >>> 0;
  }
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  return Array.from({ length: count }, (_, index) => ({
    angle: ((index + next() * 0.7) / count) * Math.PI * 2,
    speed: 0.6 + next() * 0.8,
    bright: next() > 0.5,
  }));
}
