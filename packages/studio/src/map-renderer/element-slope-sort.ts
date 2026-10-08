export type StudioElementSortMode = "auto" | "hitbox" | "slope";

export interface StudioElementSortBand {
  /** Left edge of the band, in rendered pixels local to the element. */
  x: number;
  width: number;
  /**
   * Bottom edge of each stretch of hitbox crossing this band, from the top of the element down, in rendered pixels
   * local to the element. A concave hitbox (a ridge around a cove) crosses a band several times; empty when the
   * hitbox does not cover the band.
   */
  bottoms: number[];
}

/** Slope (in rendered pixels) from which `auto` splits an element into bands. */
export const SLOPE_SORT_THRESHOLD = 16;
export const SLOPE_SORT_BAND_WIDTH = 8;

export function normalizeStudioElementSortMode(value: unknown): StudioElementSortMode {
  return value === "hitbox" || value === "slope" ? value : "auto";
}

/** Bottom of each stretch of the convex parts along the vertical line at x, top to bottom; touching stretches are merged. */
export function polygonBottomsAt(parts: Array<Array<[number, number]>>, x: number): number[] {
  const spans: Array<[number, number]> = [];
  for (const part of parts) {
    let top: number | null = null;
    let bottom: number | null = null;
    for (let i = 0; i < part.length; i += 1) {
      const [x1, y1] = part[i];
      const [x2, y2] = part[(i + 1) % part.length];
      if (x1 === x2 || x < Math.min(x1, x2) || x > Math.max(x1, x2)) continue;
      const y = y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
      if (top === null || y < top) top = y;
      if (bottom === null || y > bottom) bottom = y;
    }
    if (top !== null && bottom !== null) spans.push([top, bottom]);
  }
  spans.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span[0] <= last[1] + 1) last[1] = Math.max(last[1], span[1]);
    else merged.push([span[0], span[1]]);
  }
  return merged.map((span) => span[1]);
}

/**
 * Cuts the width of an element into columns, each with the bottom edge of its
 * polygon hitbox. Returns null when the element must keep a single sort key:
 * no polygon, an explicit `hitbox` mode, or (in `auto`) a single stretch with a
 * nearly flat bottom edge, as for a tree trunk or a wall.
 */
export function resolveStudioElementSortBands(
  parts: Array<Array<[number, number]>> | null,
  scale: { x: number; y: number },
  drawWidth: number,
  mode: StudioElementSortMode,
  bandWidth = SLOPE_SORT_BAND_WIDTH,
  threshold = SLOPE_SORT_THRESHOLD,
): StudioElementSortBand[] | null {
  if (!parts || mode === "hitbox" || drawWidth <= bandWidth) return null;
  const scaled = parts.map((part) => part.map(([x, y]): [number, number] => [x * scale.x, y * scale.y]));
  const bands: StudioElementSortBand[] = [];
  for (let x = 0; x < drawWidth; x += bandWidth) {
    const width = Math.min(bandWidth, drawWidth - x);
    bands.push({ x, width, bottoms: polygonBottomsAt(scaled, x + width / 2) });
  }
  const lowest = bands.flatMap((band) => (band.bottoms.length ? [band.bottoms[band.bottoms.length - 1]] : []));
  if (lowest.length === 0) return null;
  const concave = bands.some((band) => band.bottoms.length > 1);
  if (mode === "auto" && !concave && Math.max(...lowest) - Math.min(...lowest) < threshold) return null;
  return bands;
}
