/**
 * Orientation of a directional preset (they strike to the right) so that it
 * points from `from` to `to`: mirror when going left, then tilt.
 */
export function aim(from: { x: number; y: number }, to: { x: number; y: number }): { flip: boolean; rotation: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const flip = dx < -1;
  const rotation = Math.atan2(dy, Math.abs(dx) < 1 ? 0.001 : Math.abs(dx)) * (flip ? -1 : 1);
  return { flip, rotation };
}
