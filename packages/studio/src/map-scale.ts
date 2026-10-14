/** Read the Studio map `scale` (defaults to 1 when missing or invalid). */
export function resolveStudioMapScale(params: { scale?: unknown } | null | undefined): number {
  const scale = Number(params?.scale);
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

/**
 * Convert hitboxes from map pixels to the scaled pixels used by the game world.
 *
 * The map is drawn scaled, and the server already places the start position and
 * the events in scaled pixels, so collisions must live in the same space.
 */
export function scaleStudioHitboxes<T extends Record<string, any>>(
  hitboxes: T[],
  scale: number
): T[] {
  if (scale === 1) return hitboxes;
  return hitboxes.map((hitbox) => {
    const scaled: Record<string, any> = { ...hitbox };
    for (const key of ["x", "y", "width", "height", "radius"]) {
      if (typeof scaled[key] === "number") scaled[key] *= scale;
    }
    if (Array.isArray(scaled.points)) {
      scaled.points = scaled.points.map((point: unknown) =>
        Array.isArray(point) ? point.map((value) => (typeof value === "number" ? value * scale : value)) : point
      );
    }
    return scaled as T;
  });
}
