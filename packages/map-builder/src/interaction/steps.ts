import type { Rect } from "../renderer/geometry";
import type { MapElement } from "../model/definition";
import type { IntentOf, IntentType, PositionedIntentType } from "./intents";
import type { PipelineStep } from "./pipeline";
import { sameTarget, type TargetRef } from "./picking";

/** Rounds the position of an intent to a grid. */
export function snapToGrid<K extends PositionedIntentType>(size: number, origin: { x?: number; y?: number } = {}): PipelineStep<K> {
  if (!(size > 0)) throw new Error("snapToGrid needs a size greater than 0");
  const ox = origin.x ?? 0;
  const oy = origin.y ?? 0;
  return (intent, _context, next) =>
    next({
      ...intent,
      x: Math.round((intent.x - ox) / size) * size + ox,
      y: Math.round((intent.y - oy) / size) * size + oy,
    } as IntentOf<K>);
}

const overlaps = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const gap = (a: Rect, b: Rect): number => {
  const dx = Math.max(0, a.x - (b.x + b.width), b.x - (a.x + a.width));
  const dy = Math.max(0, a.y - (b.y + b.height), b.y - (a.y + a.height));
  return Math.hypot(dx, dy);
};

/** Refuses a position that would put the thing partly outside the map (`out-of-bounds`). */
export function withinMap<K extends PositionedIntentType>(): PipelineStep<K> {
  return (intent, context, next) => {
    const space = context.footprint(intent)?.bounds;
    if (!space) return next();
    const [width, height] = context.state.size;
    return space.x < 0 || space.y < 0 || space.x + space.width > width || space.y + space.height > height
      ? context.reject("out-of-bounds", "The position is outside the map")
      : next();
  };
}

export interface RequireFreeOptions {
  /** Whose collision boxes count as obstacles. Defaults to `"elements"`. */
  readonly against?: "elements" | "all";
}

/**
 * Refuses a position where the thing would overlap another one (`occupied`).
 * Collision boxes are used when there are, drawn bounds otherwise.
 */
export function requireFree<K extends PositionedIntentType>(options: RequireFreeOptions = {}): PipelineStep<K> {
  return (intent, context, next) => {
    const footprint = context.footprint(intent);
    if (!footprint) return next();
    const space = footprint.hitbox ?? footprint.bounds;
    const ignored = (target: TargetRef): boolean => (footprint.ignore ?? []).some((other) => sameTarget(other, target));
    const blocked = context.nodes.some(
      (node) =>
        (options.against === "all" || node.type === "element") &&
        !ignored({ type: node.type, id: node.id }) &&
        overlaps(space, node.hitbox ?? node.bounds),
    );
    return blocked ? context.reject("occupied", "Something is already there") : next();
  };
}

/** At most `limit` elements of the asset `kind` on the map (`max-count`). */
export function maxCount<K extends PositionedIntentType>(kind: string, limit: number): PipelineStep<K> {
  return (intent, context, next) => {
    // Only a placement adds one: moving an element keeps the count where it is.
    if (intent.type !== "element.place") return next();
    const placed = context.state.elements.filter((element) => element.kind === kind).length;
    return placed >= limit ? context.reject("max-count", `At most ${limit} of "${kind}" can be placed`) : next();
  };
}

/** Keeps at least `distance` pixels between the thing and the elements of asset `kind` (`too-close`). */
export function minDistance<K extends PositionedIntentType>(kind: string, distance: number): PipelineStep<K> {
  return (intent, context, next) => {
    const footprint = context.footprint(intent);
    if (!footprint) return next();
    const space = footprint.hitbox ?? footprint.bounds;
    const tooClose = context.nodes.some(
      (node) =>
        node.type === "element" &&
        node.kind === kind &&
        !(footprint.ignore ?? []).some((other) => sameTarget(other, { type: node.type, id: node.id })) &&
        gap(space, node.hitbox ?? node.bounds) < distance,
    );
    return tooClose ? context.reject("too-close", `Keep ${distance}px away from "${kind}"`) : next();
  };
}

/** What the multiplayer steps know about whoever is acting. The game decides what an actor is. */
export type ActorId = (actor: unknown) => string | undefined;

export interface OwnerOnlyOptions {
  /** Identifies the actor. Without an id, nothing owned can be touched. */
  readonly actor: ActorId;
  /** Who owns an element. Defaults to the `owner` string of its `data`. */
  readonly owner?: (element: MapElement) => string | undefined;
  /** Actors who may touch anything, such as game masters. */
  readonly bypass?: (actor: unknown) => boolean;
}

/**
 * Only the owner of an element may move or remove it (`not-owner`). Elements nobody
 * owns are free for all; stamp `data.owner` when placing to make them private.
 */
export function ownerOnly<K extends "element.move" | "element.remove">(options: OwnerOnlyOptions): PipelineStep<K> {
  const ownerOf = options.owner ?? ((element: MapElement) => (typeof element.data?.owner === "string" ? element.data.owner : undefined));
  return (intent, context, next) => {
    if (options.bypass?.(context.actor)) return next();
    const element = context.state.elements.find((entry) => entry.id === intent.id);
    const owner = element ? ownerOf(element) : undefined;
    if (owner === undefined) return next();
    return options.actor(context.actor) === owner ? next() : context.reject("not-owner", "This belongs to someone else");
  };
}

export interface RateLimitOptions {
  /** How many intents are allowed in each window. */
  readonly max: number;
  readonly windowMs: number;
  /** What the limit is counted per. Defaults to the actor itself. */
  readonly key?: (actor: unknown) => unknown;
  readonly now?: () => number;
}

/**
 * At most `max` intents per `windowMs` for each actor (`rate-limit`). A preview does
 * not count: only what is really submitted does.
 */
export function rateLimit<K extends IntentType>(options: RateLimitOptions): PipelineStep<K> {
  if (!(options.max >= 1) || !(options.windowMs > 0)) throw new Error("rateLimit needs max >= 1 and windowMs > 0");
  const now = options.now ?? (() => Date.now());
  // Objects are held weakly, so a player who leaves does not stay in memory.
  const byObject = new WeakMap<object, number[]>();
  const byValue = new Map<unknown, number[]>();
  const history = (key: unknown): number[] => {
    const table = typeof key === "object" && key !== null ? byObject : byValue;
    let list = table.get(key as never);
    if (!list) {
      list = [];
      table.set(key as never, list);
    }
    return list;
  };
  return (intent, context, next) => {
    if (context.preview) return next();
    const times = history(options.key ? options.key(context.actor) : context.actor);
    const cutoff = now() - options.windowMs;
    while (times.length > 0 && times[0]! <= cutoff) times.shift();
    if (times.length >= options.max) return context.reject("rate-limit", "Too many actions, slow down");
    times.push(now());
    return next();
  };
}

export interface ProtectedZoneOptions {
  /** Actors allowed inside the zones. */
  readonly except?: (actor: unknown) => boolean;
}

/**
 * Nothing may be placed in, moved into, moved out of or removed from these rectangles
 * (`protected-zone`): a village square, a spawn point.
 */
export function protectedZone<K extends "element.move" | "element.remove" | "element.place">(
  zones: readonly Rect[],
  options: ProtectedZoneOptions = {},
): PipelineStep<K> {
  return (intent, context, next) => {
    if (options.except?.(context.actor)) return next();
    const spaces: Rect[] = [];
    const destination = context.footprint(intent)?.bounds;
    if (destination) spaces.push(destination);
    if ("id" in intent && typeof intent.id === "string") {
      const current = context.scene.find((node) => node.type === "element" && node.id === intent.id);
      if (current) spaces.push(current.bounds);
    }
    return spaces.some((space) => zones.some((zone) => overlaps(space, zone)))
      ? context.reject("protected-zone", "This area is protected")
      : next();
  };
}
