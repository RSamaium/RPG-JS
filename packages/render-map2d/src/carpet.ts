import type { RasterImage, TerrainPresetRenderer } from "./types";

/**
 * Border of a fitted carpet, drawn over its texture from the shape of its mask alone: it follows any outline.
 * From the edge inwards: a dark outline, a binding, a guard line, a darker band with a motif repeated along the
 * edge, an inner line, then a soft shadow. A thin shadow falls on the floor around the carpet.
 *
 * The colours come from the texture of the carpet (`source`): the binding and the motif take its accent colour,
 * so a blue carpet with silver patterns gets a silver border. Without a texture they are a neutral light tone.
 *
 * `params`:
 * - `motif`: `"diamond"` (default), `"dot"` or `"none"`.
 * - `trimColor`: `"#rrggbb"`, instead of the accent colour of the texture.
 * - `scale`: width of the border, 1 by default (0.5 to 1.1: the border stays within 32 px of the edge at a
 *   tile of 48 px, the reach the terrain kernel redraws around an edit).
 * - `shadow`: `false` to draw no shadow.
 */

type Colour = [number, number, number];

/** Widths of the bands of the border, in pixels at a tile of 48 px and a scale of 1. */
const OUTLINE = 1.2;
const BINDING = 3;
const GUARD = 1;
const BAND = 8;
const INNER_LINE = 1.2;
const INNER_GUARD = 1;
const INNER_SHADOW = 12;
const OUTER_SHADOW = 3;
const MOTIF_PERIOD = 9;
const MOTIF_RADIUS = 2.4;

const NEUTRAL_TRIM: Colour = [236, 214, 160];
const NEUTRAL_DARK: Colour = [22, 14, 12];
const FAR = 16000;

const occupied = (mask: Uint8ClampedArray, index: number): boolean => mask[index * 4 + 3] >= 32;
const luminance = (colour: Colour): number => colour[0] * 0.299 + colour[1] * 0.587 + colour[2] * 0.114;
const mix = (from: Colour, to: Colour, share: number): Colour => [
  from[0] + (to[0] - from[0]) * share, from[1] + (to[1] - from[1]) * share, from[2] + (to[2] - from[2]) * share,
];

function parseColour(value: unknown): Colour | undefined {
  const match = typeof value === "string" ? /^#?([0-9a-f]{6})$/i.exec(value.trim()) : null;
  if (!match) return undefined;
  const number = parseInt(match[1], 16);
  return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
}

/** The dark tone of the pile of a carpet, and the colour of its patterns, read from its texture. */
function paletteOf(source: RasterImage | undefined): { trim: Colour; dark: Colour } {
  if (!source || source.width <= 0 || source.height <= 0) return { trim: NEUTRAL_TRIM, dark: NEUTRAL_DARK };
  const step = Math.max(1, Math.floor(Math.sqrt((source.width * source.height) / 4096)));
  const samples: Colour[] = [];
  for (let y = 0; y < source.height; y += step) {
    for (let x = 0; x < source.width; x += step) {
      const offset = (y * source.width + x) * 4;
      if (source.pixels[offset + 3] < 128) continue;
      samples.push([source.pixels[offset], source.pixels[offset + 1], source.pixels[offset + 2]]);
    }
  }
  if (!samples.length) return { trim: NEUTRAL_TRIM, dark: NEUTRAL_DARK };
  const mean = (colours: Colour[]): Colour => {
    const sum: Colour = [0, 0, 0];
    for (const colour of colours) for (let c = 0; c < 3; c++) sum[c] += colour[c];
    return [sum[0] / colours.length, sum[1] / colours.length, sum[2] / colours.length];
  };
  const base = mean(samples);
  // The patterns are what differs most from the pile, among what is lighter than it.
  const far = (colour: Colour) => Math.abs(colour[0] - base[0]) + Math.abs(colour[1] - base[1]) + Math.abs(colour[2] - base[2]);
  const lighter = samples.filter((colour) => luminance(colour) > luminance(base));
  const patterns = lighter.sort((a, b) => far(b) - far(a)).slice(0, Math.max(1, Math.ceil(samples.length / 20)));
  let trim = mix(mean(patterns.length ? patterns : samples), [255, 255, 255], 0.1);
  // A plain carpet has no pattern to take a colour from: its own colour, lighter.
  if (luminance(trim) - luminance(base) < 45) trim = mix(base, [255, 244, 214], 0.55);
  return { trim, dark: mix(base, [0, 0, 0], 0.72) };
}

/** For every pixel, the vector to the nearest target pixel (two-pass propagation over the padded grid). */
function vectorsTo(target: Uint8Array, width: number, height: number): { dx: Int16Array; dy: Int16Array } {
  const dx = new Int16Array(width * height);
  const dy = new Int16Array(width * height);
  for (let p = 0; p < target.length; p++) if (!target[p]) dx[p] = dy[p] = FAR;
  const relax = (p: number, x: number, y: number, ox: number, oy: number) => {
    const X = x + ox;
    const Y = y + oy;
    if (X < 0 || Y < 0 || X >= width || Y >= height) return;
    const q = Y * width + X;
    const cx = dx[q] + ox;
    const cy = dy[q] + oy;
    if (cx * cx + cy * cy < dx[p] * dx[p] + dy[p] * dy[p]) {
      dx[p] = cx;
      dy[p] = cy;
    }
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (!dx[p] && !dy[p]) continue;
      relax(p, x, y, -1, 0); relax(p, x, y, 0, -1); relax(p, x, y, -1, -1); relax(p, x, y, 1, -1);
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const p = y * width + x;
      if (!dx[p] && !dy[p]) continue;
      relax(p, x, y, 1, 0); relax(p, x, y, 0, 1); relax(p, x, y, 1, 1); relax(p, x, y, -1, 1);
    }
  }
  return { dx, dy };
}

export const renderCarpetPreset: TerrainPresetRenderer = ({ source, width, height, mask, tileSize, params, originX = 0, originY = 0 }) => {
  const output = new Uint8ClampedArray(width * height * 4);
  const scale = Math.min(1.1, Math.max(0.5, Number.isFinite(Number(params?.scale)) && Number(params?.scale) > 0 ? Number(params?.scale) : 1));
  const unit = (tileSize / 48) * scale;
  // Every band is at least one pixel wide, whatever the tile size.
  let edge = 0;
  const upTo = (size: number) => (edge += Math.max(1, Math.round(size * unit)));
  const outline = upTo(OUTLINE);
  const binding = upTo(BINDING);
  const guard = upTo(GUARD);
  const band = upTo(BAND);
  const innerLine = upTo(INNER_LINE);
  const innerGuard = upTo(INNER_GUARD);
  const innerShadow = innerGuard + Math.max(1, Math.round(INNER_SHADOW * unit));
  const outerShadow = Math.max(1, Math.round(OUTER_SHADOW * unit));
  const period = Math.max(4, Math.round(MOTIF_PERIOD * unit));
  const radius = Math.max(1, MOTIF_RADIUS * unit);
  const middle = (guard + band) / 2;
  const motif = params?.motif === "none" || params?.motif === "dot" ? params.motif : "diamond";
  const shadow = params?.shadow !== false;
  const palette = paletteOf(source);
  const trim = parseColour(params?.trimColor) ?? palette.trim;
  const dark = palette.dark;

  // The grid is padded by one pixel that is not carpet: the edge of the buffer is an edge of the carpet.
  const W = width + 2;
  const H = height + 2;
  const inside = new Uint8Array(W * H);
  const outside = new Uint8Array(W * H).fill(1);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!occupied(mask, y * width + x)) continue;
      inside[(y + 1) * W + x + 1] = 1;
      outside[(y + 1) * W + x + 1] = 0;
    }
  }
  const toEdge = vectorsTo(outside, W, H);
  const depth = (p: number) => Math.hypot(toEdge.dx[p], toEdge.dy[p]) - 0.5;
  const set = (index: number, colour: Colour, alpha: number) => {
    output[index * 4] = colour[0];
    output[index * 4 + 1] = colour[1];
    output[index * 4 + 2] = colour[2];
    output[index * 4 + 3] = Math.round(255 * Math.min(1, Math.max(0, alpha)));
  };

  /**
   * Whether a motif is drawn in a cell of the band, decided once for the whole cell so that no motif is cut: it
   * needs the full width of the band at its centre, on a straight run of the edge (not in a corner).
   */
  const cells = new Map<string, boolean>();
  const hasMotif = (horizontal: boolean, cell: number, line: number, inward: number): boolean => {
    const key = `${horizontal ? "h" : "v"}:${cell}:${line}:${inward}`;
    const known = cells.get(key);
    if (known !== undefined) return known;
    const along = cell * period + period / 2;
    const cx = Math.round(horizontal ? along - originX : line + inward * (middle + 0.5)) + 1;
    const cy = Math.round(horizontal ? line + inward * (middle + 0.5) : along - originY) + 1;
    let drawn = false;
    if (cx >= 1 && cy >= 1 && cx <= width && cy <= height && inside[cy * W + cx]) {
      const centre = cy * W + cx;
      const sameEdge = horizontal
        ? Math.abs(toEdge.dy[centre]) >= Math.abs(toEdge.dx[centre]) && cy - 1 + toEdge.dy[centre] === line
        : Math.abs(toEdge.dx[centre]) > Math.abs(toEdge.dy[centre]) && cx - 1 + toEdge.dx[centre] === line;
      const reach = Math.ceil(period / 2 + radius);
      const at = (offset: number) => {
        const X = horizontal ? cx + offset : cx;
        const Y = horizontal ? cy : cy + offset;
        return X < 0 || Y < 0 || X >= W || Y >= H ? 0 : depth(Y * W + X);
      };
      drawn = sameEdge && at(-reach) >= depth(centre) - 0.75 && at(reach) >= depth(centre) - 0.75;
    }
    cells.set(key, drawn);
    return drawn;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = (y + 1) * W + x + 1;
      if (!inside[p]) continue;
      const index = y * width + x;
      const vx = toEdge.dx[p];
      const vy = toEdge.dy[p];
      const d = Math.hypot(vx, vy) - 0.5;
      if (d < outline) set(index, dark, 0.86);
      else if (d < binding) {
        // The binding is rounded: lit on the sides that face the top left.
        const length = Math.hypot(vx, vy) || 1;
        const light = -((vx / length) * 0.6 + (vy / length) * 0.8);
        set(index, light > 0 ? mix(trim, [255, 255, 255], light * 0.22) : mix(trim, dark, -light * 0.3), 0.94);
      } else if (d < guard) set(index, dark, 0.62);
      else if (d < band) {
        let drawn = false;
        if (motif !== "none") {
          const horizontal = Math.abs(vy) >= Math.abs(vx);
          const along = horizontal ? x + originX : y + originY;
          const cell = Math.floor(along / period);
          const a = Math.abs(along + 0.5 - (cell * period + period / 2));
          const b = Math.abs(d - middle);
          const within = motif === "dot" ? a * a + b * b <= radius * radius : a + b <= radius;
          if (within) drawn = hasMotif(horizontal, cell, horizontal ? y + vy : x + vx, horizontal ? -Math.sign(vy) : -Math.sign(vx));
        }
        if (drawn) set(index, trim, 0.9);
        else set(index, dark, 0.3);
      } else if (d < innerLine) set(index, trim, 0.8);
      else if (d < innerGuard) set(index, dark, 0.42);
      else if (shadow && d < innerShadow) set(index, dark, 0.2 * (1 - (d - innerGuard) / (innerShadow - innerGuard)));
    }
  }

  if (shadow) {
    const toCarpet = vectorsTo(inside, W, H);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = (y + 1) * W + x + 1;
        if (inside[p]) continue;
        const d = Math.hypot(toCarpet.dx[p], toCarpet.dy[p]) - 0.5;
        if (d < outerShadow) set(y * width + x, NEUTRAL_DARK, 0.3 * (1 - d / outerShadow));
      }
    }
  }
  return output;
};
