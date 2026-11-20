/**
 * Projectiles of the Studio: a Projectile record of the database (an arrow, a bomb, a boomerang, a laser) turned into
 * the options of the projectiles of the engine (`map.projectiles.emit`) and into the look the standard projectile
 * component draws (`engine.registerProjectileLook`). The type of a projectile is the id of its record.
 */
import {
  visualEffectFx,
  visualEffectImpactPart,
  visualEffectSounds,
  visualEffectTrailPart,
  visualEffectDuration,
  type VisualEffect,
} from "./visual-effects";

export type StudioProjectileTrajectory = "straight" | "bomb" | "boomerang" | "beam";
export type StudioProjectileWall = "stop" | "bounce" | "return" | "stick";
export type StudioProjectileReaction = "stop" | "pass" | "stick";

/** A Projectile record of the database. Distances are in tiles, times in ms. */
export interface StudioProjectileRecord {
  trajectory?: StudioProjectileTrajectory;
  /** Pixels per second (straight, boomerang). */
  speed?: number;
  /** Tiles. */
  range?: number;
  /** Height of the arc of a bomb, in pixels. */
  height?: number;
  /** Flight of a bomb, in ms. */
  duration?: number;
  /** How long it stays planted, in ms. */
  lingerMs?: number;
  /** An area hit where it ends, in tiles. */
  areaRadius?: number;
  pierce?: boolean;
  wall?: StudioProjectileWall;
  /** Projectiles of one shot, spread in a cone of `spreadAngle` degrees. */
  count?: number;
  spreadAngle?: number;
  /** Id of a Visual Effect: what starts on the caster, travels with the projectile and plays where it hits. */
  visualEffect?: string;
  /** Media id of its image. */
  graphic?: string;
}

const positive = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;

/** Whether a record of the database is a Projectile. */
export const isStudioProjectileRecord = (record: unknown): record is StudioProjectileRecord =>
  !!record && typeof record === "object" && (record as { _type?: unknown })._type === "projectile";

/**
 * The options of `map.projectiles.emit` for a Projectile record (without `type`, `origin` and `direction`), and the
 * area it hits where it ends.
 *
 * @param tileWidth - The width of a tile of the map, in pixels.
 */
export function studioProjectileOptions(
  record: StudioProjectileRecord,
  tileWidth: number,
): { projectile: Record<string, unknown>; area?: { radius: number } } {
  const tile = positive(tileWidth, 32);
  const range = positive(record.range, 6) * tile;
  const speed = positive(record.speed, 300);
  const trajectory =
    record.trajectory === "bomb"
      ? { type: "arc", range, duration: positive(record.duration, 600) / 1000, height: positive(record.height, 48) }
      : record.trajectory === "boomerang"
        ? { type: "return", speed, range }
        : record.trajectory === "beam"
          ? { type: "instant", range }
          : { type: "linear", speed, range };
  const count = Math.round(positive(record.count, 1));
  const projectile: Record<string, unknown> = {
    trajectory,
    ...(record.pierce === true ? { pierce: true } : {}),
    ...(record.wall && record.wall !== "stop" ? { wall: record.wall } : {}),
    ...(positive(record.lingerMs, 0) > 0 ? { linger: { ms: record.lingerMs } } : {}),
    ...(count > 1 ? { pattern: { type: "cone", count, angle: positive(record.spreadAngle, 30) } } : {}),
  };
  const areaRadius = positive(record.areaRadius, 0);
  return areaRadius > 0 ? { projectile, area: { radius: areaRadius * tile } } : { projectile };
}

/**
 * What a Visual Effect gives to the look of a projectile: its travelling part follows it (`trailFx`), its impact part
 * plays where it hits (`impactFx`, with the first sound of the impact).
 */
export function studioProjectileEffectLook(effect: VisualEffect | undefined): Record<string, unknown> {
  if (!effect) return {};
  const trail = visualEffectTrailPart(effect);
  return {
    ...(trail ? { trailFx: visualEffectFx(trail) } : {}),
    ...studioProjectileImpactLook(visualEffectImpactPart(effect)),
  };
}

/** A whole Visual Effect played where a projectile hits (`impactFx`, with its first sound). */
export function studioProjectileImpactLook(effect: VisualEffect | undefined): Record<string, unknown> {
  const impactFx = visualEffectFx(effect);
  if (!effect || !impactFx) return {};
  const impactSound = visualEffectSounds(effect)[0]?.sound;
  return { impactFx, impactDuration: visualEffectDuration(effect), ...(impactSound ? { impactSound } : {}) };
}

/**
 * The look of a Projectile record, as the standard projectile component draws it: its image (or a bomb, or only the
 * particles of its effect), a boomerang that spins, a bomb that keeps its pose, and the parts of its Visual Effect.
 *
 * @param effect - The Visual Effect of the record (`record.visualEffect`, read from the database).
 */
export function studioProjectileLook(record: StudioProjectileRecord, effect?: VisualEffect): Record<string, unknown> {
  const fromEffect = studioProjectileEffectLook(effect);
  const graphic = typeof record.graphic === "string" && record.graphic ? record.graphic : undefined;
  const shape = graphic ? undefined : record.trajectory === "bomb" ? "bomb" : fromEffect.trailFx ? "none" : "orb";
  return {
    ...(graphic ? { graphic } : {}),
    ...(shape ? { shape } : {}),
    ...(record.trajectory === "boomerang" ? { spin: 3 } : {}),
    ...(record.trajectory === "bomb" ? { rotate: false } : {}),
    ...fromEffect,
  };
}

/**
 * How an event reacts to a projectile, from its active page: a page "Hit by a projectile" (`onProjectileHit`) runs
 * when the projectile is the one it waits for (any, without `typeData.projectile`), and says what the projectile does
 * (`stop` by default).
 */
export function studioProjectileHitReaction(
  page: { type?: string; typeData?: { projectile?: string; reaction?: string } } | null | undefined,
  projectile: { type?: string; payload?: Record<string, unknown> },
): { runs: boolean; reaction: StudioProjectileReaction } {
  if (page?.type !== "onProjectileHit") return { runs: false, reaction: "pass" };
  const wanted = page.typeData?.projectile;
  const id = projectile.payload?.["projectileId"] ?? projectile.type;
  if (wanted && id !== wanted) return { runs: false, reaction: "pass" };
  const reaction = page.typeData?.reaction;
  return { runs: true, reaction: reaction === "pass" || reaction === "stick" ? reaction : "stop" };
}
