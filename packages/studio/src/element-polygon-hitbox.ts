export interface ElementPolygonHitbox {
  id: string;
  points: [number, number][];
  x: number;
  y: number;
  width: number;
  height: number;
}

function finitePoint(point: unknown): [number, number] | null {
  if (!Array.isArray(point)) return null;
  const x = Number(point[0]);
  const y = Number(point[1]);
  return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
}

/**
 * Build the physics hitboxes of an element whose hitbox is `type: "polygon"`.
 *
 * The physics engine only handles convex static shapes, so each convex part of the hitbox
 * (`parts`, local pixels of the element) becomes one hitbox, translated to the placement and
 * scaled like the element. Returns `null` when the hitbox is not a usable polygon so that the
 * caller keeps the rectangle fallback; invalid parts (fewer than 3 distinct points) are dropped
 * because the engine throws on them.
 */
export function buildElementPolygonHitboxes(
  hitbox: any,
  origin: { x: number; y: number },
  scale: { x: number; y: number },
  idPrefix: string
): ElementPolygonHitbox[] | null {
  if (!hitbox || hitbox.type !== "polygon" || !Array.isArray(hitbox.parts)) return null;
  const hitboxes: ElementPolygonHitbox[] = [];
  hitbox.parts.forEach((part: unknown, index: number) => {
    if (!Array.isArray(part)) return;
    const points = part
      .map(finitePoint)
      .filter((point): point is [number, number] => point !== null)
      .map(([x, y]): [number, number] => [origin.x + x * scale.x, origin.y + y * scale.y]);
    if (points.length < 3) return;
    const xs = points.map((point) => point[0]);
    const ys = points.map((point) => point[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    const width = Math.max(...xs) - x;
    const height = Math.max(...ys) - y;
    if (width <= 0 || height <= 0) return;
    hitboxes.push({ id: `${idPrefix}:${index}`, points, x, y, width, height });
  });
  return hitboxes.length > 0 ? hitboxes : null;
}
