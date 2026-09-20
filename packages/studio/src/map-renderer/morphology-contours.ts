import type { StudioTerrainMorphologyFeature, StudioTerrainStroke } from './types';

type Point = { x: number; y: number };

// Build the painted surface first. Erasing a stroke's centreline and then
// expanding its remaining pieces creates caps in erased, walkable ground.
// This module is DOM-free so server physics and client prediction agree.
export function holeMorphologyContours(
  feature: StudioTerrainMorphologyFeature,
  mapWidth: number,
  mapHeight: number,
): Point[][] {
  const operations = feature.operations?.length ? feature.operations : [
    ...feature.strokes.map(stroke => ({ mode: 'paint' as const, stroke })),
    ...(feature.eraserStrokes ?? []).map(stroke => ({ mode: 'erase' as const, stroke })),
  ];
  let minX = mapWidth, minY = mapHeight, maxX = 0, maxY = 0;
  for (const { mode, stroke } of operations) {
    if (mode !== 'paint') continue;
    const radius = collisionRadius(stroke, feature);
    for (const p of stroke.points) {
      minX = Math.min(minX, p.x - radius);
      minY = Math.min(minY, p.y - radius);
      maxX = Math.max(maxX, p.x + radius);
      maxY = Math.max(maxY, p.y + radius);
    }
  }
  minX = Math.max(0, minX); minY = Math.max(0, minY);
  maxX = Math.min(mapWidth, maxX); maxY = Math.min(mapHeight, maxY);
  if (maxX <= minX || maxY <= minY) return [];

  // Normally two pixels per sample; bound temporary memory for huge maps.
  const step = Math.max(2, Math.ceil(Math.sqrt((maxX - minX) * (maxY - minY) / 4_000_000)));
  minX = Math.floor(minX / step) * step;
  minY = Math.floor(minY / step) * step;
  const width = Math.ceil((maxX - minX) / step);
  const height = Math.ceil((maxY - minY) / step);
  const cells = new Uint8Array(width * height);

  for (const { mode, stroke } of operations) {
    // collisionRadius is an optional paint override, never an eraser override.
    const radius = mode === 'paint' ? collisionRadius(stroke, feature) : stroke.radius;
    const value = mode === 'paint' ? 1 : 0;
    for (let i = 0; i < stroke.points.length; i++) {
      const a = stroke.points[Math.max(0, i - 1)], b = stroke.points[i];
      const left = Math.max(0, Math.floor((Math.min(a.x, b.x) - radius - minX) / step));
      const right = Math.min(width - 1, Math.floor((Math.max(a.x, b.x) + radius - minX) / step));
      const top = Math.max(0, Math.floor((Math.min(a.y, b.y) - radius - minY) / step));
      const bottom = Math.min(height - 1, Math.floor((Math.max(a.y, b.y) + radius - minY) / step));
      const dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy;
      for (let y = top; y <= bottom; y++) {
        const py = minY + (y + 0.5) * step - a.y;
        for (let x = left; x <= right; x++) {
          const offset = y * width + x;
          if (cells[offset] === value) continue;
          const px = minX + (x + 0.5) * step - a.x;
          const t = length === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + py * dy) / length));
          if ((px - t * dx) ** 2 + (py - t * dy) ** 2 <= radius * radius) cells[offset] = value;
        }
      }
    }
  }

  // Clockwise boundary edges only: no edges between overlapping paint strokes.
  const stride = width + 1;
  const edges = new Map<number, number[]>();
  const add = (a: number, b: number) => {
    const outgoing = edges.get(a);
    if (outgoing) outgoing.push(b);
    else edges.set(a, [b]);
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!cells[i]) continue;
      const a = y * stride + x, b = a + 1, d = a + stride, c = d + 1;
      if (y === 0 || !cells[i - width]) add(a, b);
      if (x === width - 1 || !cells[i + 1]) add(b, c);
      if (y === height - 1 || !cells[i + width]) add(c, d);
      if (x === 0 || !cells[i - 1]) add(d, a);
    }
  }
  const point = (key: number): Point => ({
    x: Math.min(mapWidth, minX + (key % stride) * step),
    y: Math.min(mapHeight, minY + Math.floor(key / stride) * step),
  });
  const contours: Point[][] = [];
  while (edges.size) {
    const start = edges.keys().next().value!;
    const loop: Point[] = [];
    let current = start, previous = -1;
    do {
      loop.push(point(current));
      const outgoing = edges.get(current)!;
      // At diagonal contacts turn right to keep the two components separate.
      let index = 0;
      if (outgoing.length > 1 && previous !== -1) {
        const p = point(previous), q = point(current);
        index = outgoing.findIndex(key => {
          const r = point(key);
          return (q.x - p.x) * (r.y - q.y) - (q.y - p.y) * (r.x - q.x) > 0;
        });
        if (index < 0) index = 0;
      }
      const next = outgoing.splice(index, 1)[0];
      if (!outgoing.length) edges.delete(current);
      previous = current;
      current = next;
    } while (current !== start && edges.has(current));
    if (loop.length < 4) continue;
    // Split the closed ring before RDP; identical endpoints would collapse it.
    const middle = Math.floor(loop.length / 2);
    const simplified = [
      ...simplify(loop.slice(0, middle + 1), step * 1.5).slice(0, -1),
      ...simplify([...loop.slice(middle), loop[0]], step * 1.5).slice(0, -1),
    ];
    if (simplified.length >= 3) contours.push(simplified);
  }
  return contours;
}

function collisionRadius(stroke: StudioTerrainStroke, feature: StudioTerrainMorphologyFeature): number {
  const explicit = Number(feature.params.collisionRadius);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const roughness = Math.max(0, Math.min(1, Number(feature.params.roughness) || 0));
  return Math.max(1, stroke.radius * (1 + roughness * 0.024));
}

function simplify(points: Point[], tolerance: number): Point[] {
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const pending = [[0, points.length - 1]];
  while (pending.length) {
    const [start, end] = pending.pop()!;
    const a = points[start], b = points[end];
    const dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy;
    let maximum = tolerance * tolerance, furthest = -1;
    for (let i = start + 1; i < end; i++) {
      const px = points[i].x - a.x, py = points[i].y - a.y;
      const t = length === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + py * dy) / length));
      const distance = (px - t * dx) ** 2 + (py - t * dy) ** 2;
      if (distance > maximum) { maximum = distance; furthest = i; }
    }
    if (furthest !== -1) {
      keep[furthest] = 1;
      pending.push([start, furthest], [furthest, end]);
    }
  }
  return points.filter((_, i) => keep[i]);
}
