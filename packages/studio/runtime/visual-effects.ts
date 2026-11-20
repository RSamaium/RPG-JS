/**
 * Visual Effects of the Studio: one particle preset of `@canvasengine/presets` played by a skill, an item, a
 * projectile or an event, with the sounds placed on its timeline and the moment the target is hit.
 *
 * A preset is written from the caster at `(0, 0)`. An emitter going to the target says so: `pathSpace: "target"`
 * (its `path` follows the caster → target line) or `at: "target"` (it plays on the target). The engine plays them
 * with `map.playVisualEffect(position, id, { preset, target })`; this file only reads the records of the database
 * and turns them into the options of the engine. It depends on nothing, so the Studio can share it.
 */

export const VISUAL_EFFECT_CATEGORIES = ["attack", "magic", "projectile", "impact", "aura", "status"] as const;
export type VisualEffectCategory = (typeof VISUAL_EFFECT_CATEGORIES)[number];

/** Distance to the target when nothing gives one (an effect with no target), in pixels. */
export const VISUAL_EFFECT_REFERENCE_DISTANCE = 200;

/** A particle preset (`FxPreset` of `@canvasengine/presets`), kept loose. */
export type VisualEffectPreset = { duration?: number; delay?: number; emitters: Record<string, unknown>[] };

export interface VisualEffectSound {
  /** Media id of a sound. */
  sound: string;
  /** Start in ms from the start of the effect. */
  start: number;
  /** 0 to 100. */
  volume?: number;
}

export interface VisualEffectSettings {
  color?: string;
  intensity?: number;
  sizeScale?: number;
  speedScale?: number;
}

/** A Visual Effect record of the database. */
export interface VisualEffect {
  name?: string;
  category?: VisualEffectCategory;
  /** A built-in preset name (`fireball`), used when `preset` is empty. */
  base?: string;
  preset?: VisualEffectPreset;
  settings?: VisualEffectSettings;
  /** Length of the effect in ms (the timeline). */
  duration?: number;
  /** When the target is hit, in ms: damage, numbers and hit reactions happen here. */
  hitAt?: number;
  /** Auras and statuses play until stopped. */
  loop?: boolean;
  sounds?: VisualEffectSound[];
}

export interface Point {
  x: number;
  y: number;
}

/** Where an effect plays: a point, or a character (its center). */
export type VisualEffectAnchor =
  | Point
  | { x: number | (() => number); y: number | (() => number); hitbox?: () => { w: number; h: number } };

/** The options of `map.playVisualEffect` of the engine. */
export interface EngineVisualEffectOptions {
  preset?: Record<string, unknown>;
  duration?: number;
  target?: Point;
  color?: string;
  intensity?: number;
  sizeScale?: number;
  speedScale?: number;
  delay?: number;
  sounds?: { sound: string; start: number; volume: number }[];
}

/** A map of the engine, as far as the effects need it. */
export interface VisualEffectMap {
  database?: () => Record<string, unknown>;
  playVisualEffect?: (position: Point, effect: string, options?: EngineVisualEffectOptions) => void;
  tileWidth?: number;
}

/** When an effect that was played hits, and when it ends, in ms from now. */
export interface PlayedVisualEffect {
  hitAt: number;
  duration: number;
}

const DEFAULT_DURATION = 1000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const positive = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;

const read = (value: unknown, owner: unknown): number => {
  const raw = typeof value === "function" ? value.call(owner) : value;
  const number = Number(raw);
  return Number.isFinite(number) ? number : 0;
};

/** The point of an anchor: a point as it is, the center of a character. */
export function visualEffectPoint(anchor: VisualEffectAnchor): Point {
  const x = read(anchor.x, anchor);
  const y = read(anchor.y, anchor);
  const hitbox = "hitbox" in anchor && typeof anchor.hitbox === "function" ? anchor.hitbox() : undefined;
  return hitbox ? { x: x + hitbox.w / 2, y: y + hitbox.h / 2 } : { x, y };
}

const RIGHT: Point = { x: 1, y: 0 };
const FACING: Record<string, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: RIGHT };

/** The way a character faces, as a unit vector (right for a point). */
export function visualEffectFacing(anchor: VisualEffectAnchor): Point {
  const owner = anchor as { getDirection?: () => unknown; direction?: unknown };
  const direction = typeof owner.getDirection === "function"
    ? owner.getDirection()
    : typeof owner.direction === "function" ? (owner.direction as () => unknown).call(anchor) : owner.direction;
  return FACING[String(direction)] ?? RIGHT;
}

/** The map of a character, or the map itself. */
export function visualEffectMapOf(host: unknown): VisualEffectMap | undefined {
  const owner = host as { getCurrentMap?: () => unknown };
  const map = typeof owner?.getCurrentMap === "function" ? owner.getCurrentMap() : host;
  return map && typeof map === "object" ? (map as VisualEffectMap) : undefined;
}

/** A Visual Effect given by its id in the database, or as a record. */
export function resolveVisualEffect(map: VisualEffectMap | undefined, effect: string | VisualEffect | undefined): VisualEffect | undefined {
  if (!effect) return undefined;
  if (typeof effect !== "string") return effect;
  const record = map?.database?.()[effect];
  return isRecord(record) && (isRecord(record.preset) || typeof record.base === "string") ? (record as VisualEffect) : undefined;
}

const hasPreset = (effect: VisualEffect) => Array.isArray(effect.preset?.emitters) && effect.preset!.emitters.length > 0;

/** The preset without what plays on the target: an effect that has no target plays no impact. */
function withoutTargetEmitters(items: unknown[]): Record<string, unknown>[] {
  return items
    .filter((item) => !(isRecord(item) && item["at"] === "target"))
    .map((item) => (isRecord(item) && Array.isArray(item["emitters"]) ? { ...item, emitters: withoutTargetEmitters(item["emitters"]) } : item)) as Record<string, unknown>[];
}

/** The tuning of an effect (`settings`), as the engine reads it. */
export function visualEffectTuning(effect: VisualEffect): Pick<EngineVisualEffectOptions, "color" | "intensity" | "sizeScale" | "speedScale"> {
  const settings = effect.settings ?? {};
  return {
    ...(typeof settings.color === "string" && settings.color ? { color: settings.color } : {}),
    ...(positive(settings.intensity) !== undefined ? { intensity: settings.intensity } : {}),
    ...(positive(settings.sizeScale) !== undefined ? { sizeScale: settings.sizeScale } : {}),
    ...(positive(settings.speedScale) !== undefined ? { speedScale: settings.speedScale } : {}),
  };
}

/** The sounds of an effect, as the engine plays them (volume 0 to 1). */
export function visualEffectSounds(effect: VisualEffect): { sound: string; start: number; volume: number }[] {
  return (effect.sounds ?? [])
    .filter((entry) => typeof entry?.sound === "string" && entry.sound)
    .map((entry) => ({
      sound: entry.sound,
      start: positive(entry.start) ?? 0,
      volume: Math.max(0, Math.min(100, positive(entry.volume) ?? 100)) / 100,
    }));
}

/** The length of an effect, in ms. */
export const visualEffectDuration = (effect: VisualEffect): number =>
  positive(effect.duration) || positive(effect.preset?.duration) || DEFAULT_DURATION;

/**
 * The options of `map.playVisualEffect` for an effect played from `from`: toward `to`, or the way `facing` points
 * over `distance` (and then without what plays on the target).
 */
export function visualEffectOptions(
  effect: VisualEffect,
  options: { from: Point; to?: Point; facing?: Point; distance?: number; delay?: number },
): { name: string; options: EngineVisualEffectOptions } {
  const facing = options.facing ?? RIGHT;
  const distance = positive(options.distance) || VISUAL_EFFECT_REFERENCE_DISTANCE;
  const target = options.to ?? { x: options.from.x + facing.x * distance, y: options.from.y + facing.y * distance };
  const preset = hasPreset(effect)
    ? options.to ? effect.preset! : { ...effect.preset!, emitters: withoutTargetEmitters(effect.preset!.emitters) }
    : undefined;
  const sounds = visualEffectSounds(effect);
  const delay = positive(options.delay) ?? 0;
  return {
    name: effect.base || "hitSpark",
    options: {
      ...(preset ? { preset } : {}),
      target,
      ...visualEffectTuning(effect),
      duration: visualEffectDuration(effect),
      ...(delay > 0 ? { delay } : {}),
      ...(sounds.length ? { sounds } : {}),
    },
  };
}

/**
 * Plays a Visual Effect of the database on the map of `host` (a map, or a character on it), from `from` toward `to`.
 * Without `to`, it travels the way `from` faces over `distance`, with no impact.
 *
 * @returns When it hits and ends, or `undefined` when nothing was played (no map, no such effect).
 */
export function playStudioVisualEffect(
  host: unknown,
  effect: string | VisualEffect | undefined,
  options: { from: VisualEffectAnchor; to?: VisualEffectAnchor; distance?: number; delay?: number },
): PlayedVisualEffect | undefined {
  const map = visualEffectMapOf(host);
  if (typeof map?.playVisualEffect !== "function") return undefined;
  const record = resolveVisualEffect(map, effect);
  if (!record) return undefined;
  const from = visualEffectPoint(options.from);
  const played = visualEffectOptions(record, {
    from,
    to: options.to ? visualEffectPoint(options.to) : undefined,
    facing: visualEffectFacing(options.from),
    distance: options.distance,
    delay: options.delay,
  });
  map.playVisualEffect(from, played.name, played.options);
  const delay = played.options.delay ?? 0;
  const duration = played.options.duration ?? DEFAULT_DURATION;
  return { hitAt: delay + Math.min(positive(record.hitAt) ?? 0, duration), duration: delay + duration };
}

// The three parts of an effect played by a projectile: what starts on the caster at launch, what travels with the
// projectile, what plays where it hits.

type Emitter = Record<string, unknown>;
const isTravelling = (item: Emitter) => item["pathSpace"] === "target";
const isImpact = (item: Emitter) => item["at"] === "target";
const hitAtOf = (effect: VisualEffect) => Math.max(0, Math.min(positive(effect.hitAt) ?? 0, visualEffectDuration(effect)));

const partOf = (
  effect: VisualEffect,
  keep: (item: Emitter) => boolean,
  change: (item: Emitter) => Emitter,
  sounds: { from: number; to: number },
): VisualEffect | undefined => {
  if (!hasPreset(effect)) return undefined;
  const emitters = (effect.preset!.emitters as Emitter[]).filter(keep).map(change);
  if (!emitters.length) return undefined;
  return {
    ...effect,
    preset: { ...effect.preset!, emitters },
    duration: Math.max(300, sounds.to - sounds.from),
    hitAt: 0,
    sounds: (effect.sounds ?? [])
      .filter((sound) => sound.start >= sounds.from && sound.start < sounds.to)
      .map((sound) => ({ ...sound, start: sound.start - sounds.from })),
  };
};

/** What starts on the caster, until the hit. */
export const visualEffectCastPart = (effect: VisualEffect) =>
  partOf(effect, (item) => !isTravelling(item) && !isImpact(item), (item) => item, { from: 0, to: hitAtOf(effect) || visualEffectDuration(effect) });

/** What travels to the target, without its path: it follows the projectile. */
export const visualEffectTrailPart = (effect: VisualEffect) =>
  partOf(effect, isTravelling, ({ path: _path, pathSpace: _space, ...item }) => item, { from: 0, to: 0 });

/** What plays on the target, from the hit. */
export const visualEffectImpactPart = (effect: VisualEffect) =>
  partOf(effect, isImpact, (item) => item, { from: hitAtOf(effect), to: Math.max(visualEffectDuration(effect), hitAtOf(effect) + 300) });

/**
 * An effect as a particle effect of a projectile (`trailFx` / `impactFx` of a projectile look): its preset, or its
 * built-in preset, with its tuning.
 */
export function visualEffectFx(effect: VisualEffect | undefined): Record<string, unknown> | undefined {
  if (!effect) return undefined;
  if (hasPreset(effect)) return { preset: effect.preset, ...visualEffectTuning(effect) };
  return effect.base ? { name: effect.base, ...visualEffectTuning(effect) } : undefined;
}
