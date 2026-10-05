import type { Rect } from "../renderer/geometry";
import type { IntentOf, PositionedIntentType } from "./intents";
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
