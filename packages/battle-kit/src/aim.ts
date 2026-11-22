/** A position in pixels. */
export interface Point {
  x: number;
  y: number;
}

/**
 * Orientation of a directional preset (they strike to the right) so that it
 * points from `from` to `to`: mirror when going left, then tilt.
 *
 * @example
 * ```ts
 * fx.play("swordSlash", target.x, target.y, aim(caster, target));
 * ```
 */
export function aim(from: Point, to: Point): { flip: boolean; rotation: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const flip = dx < -1;
  const rotation = Math.atan2(dy, Math.abs(dx) < 1 ? 0.001 : Math.abs(dx)) * (flip ? -1 : 1);
  return { flip, rotation };
}
