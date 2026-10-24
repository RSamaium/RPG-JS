import { getGraphicScale } from "./graphic-key";

/**
 * The size a map gives to one placement of an event: `scale` multiplies its character and its hitbox (1 when the placement says
 * none), so the same event can be bigger here than there.
 */
export const readPlacementScale = (placement: unknown): number => {
  const value = (placement as { scale?: unknown } | null | undefined)?.scale;
  const number = typeof value === "string" ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number) && number > 0 ? number : 1;
};

/** The scale of the character of an event: the one it has by itself, times the one of its placement. */
export const resolveEventGraphicScale = (object: unknown, ...sources: unknown[]): number | [number, number] | { x: number; y?: number } | undefined => {
  const factor = readPlacementScale(object);
  // The event is a placement with a position (`x`, `y`) and a `scale` that is the multiplier: only what the event says of its own
  // character counts, or its position would be read as a scale
  const own = object && typeof object === "object" ? { params: (object as { params?: unknown }).params, metadata: (object as { metadata?: unknown }).metadata } : object;
  const base = getGraphicScale(...sources.map((source) => (source === object ? own : source)));
  if (factor === 1) return base;
  if (base === undefined) return factor;
  if (typeof base === "number") return base * factor;
  if (Array.isArray(base)) return [base[0] * factor, base[1] * factor];
  return { x: base.x * factor, y: (base.y ?? base.x) * factor };
};

/** A hitbox times the scale of its placement. */
export const scaleHitboxToPlacement = <T extends { width: number; height: number }>(hitbox: T, placement: unknown): T => {
  const factor = readPlacementScale(placement);
  if (factor === 1) return hitbox;
  return { ...hitbox, width: Math.max(1, Math.round(hitbox.width * factor)), height: Math.max(1, Math.round(hitbox.height * factor)) };
};
