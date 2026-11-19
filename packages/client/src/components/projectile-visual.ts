import type { ClientProjectileSurface } from "../Game/ProjectileManager";

/**
 * Look of a projectile drawn by the standard projectile component. Register it
 * per projectile type on the client with `projectiles.looks`; the server can
 * still override single fields of one shot through `params`. Every field is
 * optional.
 *
 * @example
 * ```ts
 * defineModule<RpgClient>({
 *   projectiles: {
 *     looks: {
 *       arrow: { shape: "arrow", trail: { color: "#fde68a" } },
 *     },
 *   },
 * });
 * ```
 */
export interface ProjectileLook {
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
  /** Sound id played on impact. It fades with the distance to the local player and pans to the side of the impact. */
  impactSound?: string;
  /** Shake the map on impact: `true`, or the intensity. It fades with the distance to the local player. */
  shake?: boolean | number;
  /**
   * Beyond this distance from the local player, in pixels, the impact plays no sound and does not shake the map.
   * Defaults to 480: in an MMORPG, the impacts of a fight elsewhere on the map stay silent.
   */
  feedbackDistance?: number;
  /** How long the impact stays drawn, in ms. Defaults to 350. */
  impactDuration?: number;
}

/** Distance under which an impact is felt at full strength, in pixels. */
const FULL_FEEDBACK_DISTANCE = 64;
const DEFAULT_FEEDBACK_DISTANCE = 480;
const DEFAULT_SHAKE = 4;

/**
 * How an impact is felt by the local player: the shake intensity and the distance at which its sound becomes silent, or
 * `null` when the impact is too far to be felt. Both fade from 64 px to `feedbackDistance`. Without a local player (no
 * player on this client), the impact is felt at full strength.
 */
export function projectileImpactFeedback(
  impact: { x: number; y: number },
  listener: { x: number; y: number } | null | undefined,
  look: Pick<ProjectileLook, "shake" | "feedbackDistance">,
): { shake: number; maxDistance: number } | null {
  const maxDistance = Math.max(FULL_FEEDBACK_DISTANCE + 1, Number(look.feedbackDistance) || DEFAULT_FEEDBACK_DISTANCE);
  const baseShake = look.shake === true ? DEFAULT_SHAKE : typeof look.shake === "number" && look.shake > 0 ? look.shake : 0;
  if (!listener) return { shake: baseShake, maxDistance };
  const distance = Math.hypot(impact.x - listener.x, impact.y - listener.y);
  if (distance >= maxDistance) return null;
  const strength = distance <= FULL_FEEDBACK_DISTANCE
    ? 1
    : 1 - (distance - FULL_FEEDBACK_DISTANCE) / (maxDistance - FULL_FEEDBACK_DISTANCE);
  return { shake: baseShake * strength, maxDistance };
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
  trail: ProjectileLook["trail"],
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

/**
 * Particle preset of the flying projectile, or `null`. `"auto"` and `"none"`
 * (Studio defaults) are not preset names and draw no particles.
 */
export function projectileTrailFx(value: unknown): string | null {
  if (typeof value !== "string" || !value || value === "auto" || value === "none") return null;
  return value;
}

/** Particle preset to play for an impact on `surface`, or `null` for the drawn impact. */
export function projectileImpactFx(
  impactFx: ProjectileLook["impactFx"],
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
