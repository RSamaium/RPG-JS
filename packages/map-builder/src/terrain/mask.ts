import { NO_MATERIAL, type MaskRect, type TerrainData, type TerrainMask, type TerrainShape } from "./types";
import { decodeRuns, encodeRuns } from "./rle";

/** Pure operations on the chunked mask. Nothing here mutates its input. */
const key = (col: number, row: number): string => `${col},${row}`;

export const chunkCount = (mask: TerrainMask): { cols: number; rows: number } => ({
  cols: Math.ceil(mask.width / mask.chunk),
  rows: Math.ceil(mask.height / mask.chunk),
});

/** The values of a chunk. A chunk that is not stored is flat. */
export function readChunk(mask: TerrainMask, col: number, row: number): Uint16Array {
  const stored = mask.chunks[key(col, row)];
  if (stored === undefined) return new Uint16Array(mask.chunk * mask.chunk).fill(mask.fill);
  return decodeRuns(stored, mask.chunk * mask.chunk);
}

/** Material index at a mask pixel. */
export function readPixel(mask: TerrainMask, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return NO_MATERIAL;
  return readChunk(mask, Math.floor(x / mask.chunk), Math.floor(y / mask.chunk))[(y % mask.chunk) * mask.chunk + (x % mask.chunk)]!;
}

/** Whole mask as one array, row by row. For the kernel and for tests: it is as big as the map. */
export function readAll(mask: TerrainMask): Uint16Array {
  const out = new Uint16Array(mask.width * mask.height);
  const { cols, rows } = chunkCount(mask);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const chunk = readChunk(mask, col, row);
      const width = Math.min(mask.chunk, mask.width - col * mask.chunk);
      const height = Math.min(mask.chunk, mask.height - row * mask.chunk);
      for (let y = 0; y < height; y += 1) {
        out.set(chunk.subarray(y * mask.chunk, y * mask.chunk + width), (row * mask.chunk + y) * mask.width + col * mask.chunk);
      }
    }
  }
  return out;
}

/** Values of a rectangle, row by row. The rectangle is clipped by the caller. */
export function readRect(mask: TerrainMask, rect: MaskRect): Uint16Array {
  const out = new Uint16Array(rect.width * rect.height);
  const c0 = Math.floor(rect.x / mask.chunk);
  const c1 = Math.floor((rect.x + rect.width - 1) / mask.chunk);
  const r0 = Math.floor(rect.y / mask.chunk);
  const r1 = Math.floor((rect.y + rect.height - 1) / mask.chunk);
  for (let row = r0; row <= r1; row += 1) {
    for (let col = c0; col <= c1; col += 1) {
      const chunk = readChunk(mask, col, row);
      const x0 = Math.max(rect.x, col * mask.chunk);
      const x1 = Math.min(rect.x + rect.width, (col + 1) * mask.chunk);
      const y0 = Math.max(rect.y, row * mask.chunk);
      const y1 = Math.min(rect.y + rect.height, (row + 1) * mask.chunk);
      for (let y = y0; y < y1; y += 1) {
        const from = (y - row * mask.chunk) * mask.chunk + (x0 - col * mask.chunk);
        out.set(chunk.subarray(from, from + (x1 - x0)), (y - rect.y) * rect.width + (x0 - rect.x));
      }
    }
  }
  return out;
}

export function clipRect(mask: TerrainMask, rect: MaskRect): MaskRect | undefined {
  const x0 = Math.max(0, Math.floor(rect.x));
  const y0 = Math.max(0, Math.floor(rect.y));
  const x1 = Math.min(mask.width, Math.ceil(rect.x + rect.width));
  const y1 = Math.min(mask.height, Math.ceil(rect.y + rect.height));
  return x1 > x0 && y1 > y0 ? { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } : undefined;
}

/** Bounds of a shape in mask pixels, clipped to the mask. `undefined` when it is entirely outside. */
export function shapeBounds(mask: TerrainMask, shape: TerrainShape): MaskRect | undefined {
  const s = mask.scale;
  switch (shape.type) {
    case "fill":
      return { x: 0, y: 0, width: mask.width, height: mask.height };
    case "circle":
      return clipRect(mask, { x: (shape.x - shape.radius) / s, y: (shape.y - shape.radius) / s, width: (shape.radius * 2) / s + 1, height: (shape.radius * 2) / s + 1 });
    case "rect":
      return clipRect(mask, { x: shape.x / s, y: shape.y / s, width: shape.width / s, height: shape.height / s });
    case "stroke": {
      if (shape.points.length === 0) return undefined;
      const xs = shape.points.map((p) => p[0]);
      const ys = shape.points.map((p) => p[1]);
      const x0 = Math.min(...xs) - shape.radius;
      const y0 = Math.min(...ys) - shape.radius;
      return clipRect(mask, { x: x0 / s, y: y0 / s, width: (Math.max(...xs) - Math.min(...xs) + shape.radius * 2) / s + 1, height: (Math.max(...ys) - Math.min(...ys) + shape.radius * 2) / s + 1 });
    }
  }
}

const distanceToSegment2 = (px: number, py: number, ax: number, ay: number, bx: number, by: number): number => {
  const dx = bx - ax;
  const dy = by - ay;
  const length2 = dx * dx + dy * dy;
  const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length2));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return (px - cx) ** 2 + (py - cy) ** 2;
};

/** Whether the centre of a mask pixel is inside the shape. */
function covers(mask: TerrainMask, shape: TerrainShape, x: number, y: number): boolean {
  const wx = (x + 0.5) * mask.scale;
  const wy = (y + 0.5) * mask.scale;
  switch (shape.type) {
    case "fill":
      return true;
    case "circle":
      return (wx - shape.x) ** 2 + (wy - shape.y) ** 2 <= shape.radius ** 2;
    case "rect":
      return wx >= shape.x && wx < shape.x + shape.width && wy >= shape.y && wy < shape.y + shape.height;
    case "stroke": {
      const r2 = shape.radius ** 2;
      if (shape.points.length === 1) return (wx - shape.points[0]![0]) ** 2 + (wy - shape.points[0]![1]) ** 2 <= r2;
      for (let i = 1; i < shape.points.length; i += 1) {
        const a = shape.points[i - 1]!;
        const b = shape.points[i]!;
        if (distanceToSegment2(wx, wy, a[0], a[1], b[0], b[1]) <= r2) return true;
      }
      return false;
    }
  }
}

export interface PaintResult {
  readonly mask: TerrainMask;
  /** Smallest rectangle (in mask pixels) that contains every pixel that changed. Undefined when none did. */
  readonly changed?: MaskRect;
  /** The values of `changed` before the change, for the inverse. */
  readonly before?: Uint16Array;
}

/** Sets the material under a shape. Chunks that do not change are shared with the input. */
export function paintShape(mask: TerrainMask, shape: TerrainShape, material: number): PaintResult {
  const bounds = shapeBounds(mask, shape);
  if (!bounds) return { mask };
  const c0 = Math.floor(bounds.x / mask.chunk);
  const c1 = Math.floor((bounds.x + bounds.width - 1) / mask.chunk);
  const r0 = Math.floor(bounds.y / mask.chunk);
  const r1 = Math.floor((bounds.y + bounds.height - 1) / mask.chunk);
  const next: Record<string, string> = { ...mask.chunks };
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (let row = r0; row <= r1; row += 1) {
    for (let col = c0; col <= c1; col += 1) {
      const values = readChunk(mask, col, row);
      let dirty = false;
      const x0 = Math.max(bounds.x, col * mask.chunk);
      const x1 = Math.min(bounds.x + bounds.width, (col + 1) * mask.chunk);
      const y0 = Math.max(bounds.y, row * mask.chunk);
      const y1 = Math.min(bounds.y + bounds.height, (row + 1) * mask.chunk);
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          if (!covers(mask, shape, x, y)) continue;
          const index = (y - row * mask.chunk) * mask.chunk + (x - col * mask.chunk);
          if (values[index] === material) continue;
          values[index] = material;
          dirty = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
      if (!dirty) continue;
      const encoded = encodeRuns(values);
      // A chunk that went back to being flat is not stored.
      if (values.every((value) => value === mask.fill)) delete next[key(col, row)];
      else next[key(col, row)] = encoded;
    }
  }
  if (maxX < 0) return { mask };
  const changed: MaskRect = { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  // The values before, over the changed rectangle, taken from the chunks as they were.
  const before = readRect(mask, changed);
  return { mask: { ...mask, chunks: next }, changed, before };
}

/** Writes values over a rectangle (an inverse, or an imported region). Chunks that do not change are shared. */
export function writeRect(mask: TerrainMask, rect: MaskRect, values: ArrayLike<number>): PaintResult {
  const clipped = clipRect(mask, rect);
  if (!clipped || clipped.x !== rect.x || clipped.y !== rect.y || clipped.width !== rect.width || clipped.height !== rect.height) return { mask };
  const c0 = Math.floor(rect.x / mask.chunk);
  const c1 = Math.floor((rect.x + rect.width - 1) / mask.chunk);
  const r0 = Math.floor(rect.y / mask.chunk);
  const r1 = Math.floor((rect.y + rect.height - 1) / mask.chunk);
  const next: Record<string, string> = { ...mask.chunks };
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (let row = r0; row <= r1; row += 1) {
    for (let col = c0; col <= c1; col += 1) {
      const chunk = readChunk(mask, col, row);
      let dirty = false;
      const x0 = Math.max(rect.x, col * mask.chunk);
      const x1 = Math.min(rect.x + rect.width, (col + 1) * mask.chunk);
      const y0 = Math.max(rect.y, row * mask.chunk);
      const y1 = Math.min(rect.y + rect.height, (row + 1) * mask.chunk);
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const value = values[(y - rect.y) * rect.width + (x - rect.x)]!;
          const index = (y - row * mask.chunk) * mask.chunk + (x - col * mask.chunk);
          if (chunk[index] === value) continue;
          chunk[index] = value;
          dirty = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
      if (!dirty) continue;
      if (chunk.every((value) => value === mask.fill)) delete next[key(col, row)];
      else next[key(col, row)] = encodeRuns(chunk);
    }
  }
  if (maxX < 0) return { mask };
  const changed: MaskRect = { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  return { mask: { ...mask, chunks: next }, changed, before: readRect(mask, changed) };
}

/** A new, flat mask. */
export function createMask(width: number, height: number, options: { scale?: number; chunk?: number; fill?: number } = {}): TerrainMask {
  const scale = options.scale ?? 1;
  return {
    scale,
    width: Math.ceil(width / scale),
    height: Math.ceil(height / scale),
    chunk: options.chunk ?? 256,
    fill: options.fill ?? NO_MATERIAL,
    chunks: {},
  };
}

export type { TerrainData };
