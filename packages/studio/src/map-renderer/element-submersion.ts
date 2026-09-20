/** Optional client-side immersion of a static map element; never affects physics. */
export interface StudioElementSubmersion {
  /** Proportion of rendered height immersed, from 0 to 1. Zero disables it. @example 0.2 */
  depth: number;
}

export function normalizeElementSubmersion(value: unknown): StudioElementSubmersion | undefined {
  const depth = (value as StudioElementSubmersion | null)?.depth;
  return typeof depth === 'number' && Number.isFinite(depth) && depth > 0
    ? { depth: Math.min(1, depth) } : undefined;
}

/** Local, world-aligned liquid coverage and optional contact color. */
export interface ElementLiquidRegion {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
  contact: Uint8ClampedArray;
}

/** Applies immersion once to rendered, shadow-separated sprite pixels. */
export function submergeElementPixels(source: Uint8ClampedArray, liquid: ElementLiquidRegion, depth: number): Uint8ClampedArray {
  const output = new Uint8ClampedArray(source);
  const { width, height, pixels, contact } = liquid;
  const normalized = normalizeElementSubmersion({ depth });
  if (!normalized) return output;
  const start = height * (1 - normalized.depth);
  const wet = (x: number, y: number) => x >= 0 && y >= start && x < width && y < height
    && source[(y * width + x) * 4 + 3] > 24 && pixels[(y * width + x) * 4 + 3] > 0;
  for (let y = Math.floor(start); y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    if (!wet(x, y)) continue;
    const coverage = pixels[i + 3] / 255;
    const amount = coverage * (0.3 + 0.25 * (y - start) / Math.max(1, height - start));
    for (let c = 0; c < 3; c++) output[i + c] = source[i + c] * (1 - amount) + pixels[i + c] * amount;
    output[i + 3] = source[i + 3] * (1 - coverage * 0.22);
    // Contact follows both the alpha silhouette and the actual liquid shoreline.
    // A deterministic variation breaks up the line without rebuilding it per frame.
    const edge = !wet(x - 1, y) || !wet(x + 1, y) || !wet(x, y - 1);
    if (edge && contact[i + 3]) {
      const accent = contact[i + 3] / 255 * (0.35 + 0.25 * (0.5 + 0.5 * Math.sin(x * 0.71 + y * 0.43)));
      for (let c = 0; c < 3; c++) output[i + c] = output[i + c] * (1 - accent) + contact[i + c] * accent;
    }
  }
  return output;
}
