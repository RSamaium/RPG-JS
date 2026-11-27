/**
 * A position in pixels (layer or screen coordinates, depending on the API).
 * Any runtime.
 *
 * @title Point
 * @example
 * ```ts
 * const caster: Point = { x: 120, y: 200 };
 * ```
 */
export interface Point {
  /**
   * Horizontal position (px).
   *
   * @prop {number} x
   * @memberof Point
   */
  x: number;
  /**
   * Vertical position (px, down is positive).
   *
   * @prop {number} y
   * @memberof Point
   */
  y: number;
}

/**
 * Orientation of a directional preset (they strike to the right) so that it
 * points from `from` to `to`: mirror when going left, then tilt. Any runtime.
 *
 * @title aim
 * @method aim(from, to)
 * @param {Point} from - Where the strike comes from (the caster)
 * @param {Point} to - Where it goes (the target)
 * @returns {{ flip: boolean; rotation: number }} `flip` when the target is to the left, and the tilt in radians; spread it in the preset options
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
