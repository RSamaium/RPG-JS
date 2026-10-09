import type { RasterImage, TerrainRenderBounds } from './types';

/** Texture-derived RGB colors shared by CPU and Canvas liquid renderers. */
export interface TerrainLiquidPalette {
  /** Dominant opaque texture color. */
  base: readonly [number, number, number];
  /** Bright sampled color, retaining the material's hue. */
  highlight: readonly [number, number, number];
  /** Dark contact color derived from the texture. */
  shadow: readonly [number, number, number];
}

/**
 * Samples at most 1024 opaque pixels in a texture region to resolve liquid colors.
 * No liquid-name classification or blue/white fallback is applied. Hosts should
 * cache the result by image revision and atlas region. Works without a DOM in
 * editor, client, and server-side render jobs; it does not change gameplay.
 * @param image Decoded RGBA texture, when available.
 * @param region Atlas region; defaults to the whole image.
 * @param fillColor Optional hex or rgb/rgba fallback when no opaque samples exist.
 * @returns Sampled colors, or null when neither pixels nor a valid fallback exist.
 * @example
 * const palette = resolveTerrainLiquidPalette(atlas, { x: 48, y: 0, width: 48, height: 48 });
 */
export function resolveTerrainLiquidPalette(
  image?: RasterImage | null,
  region?: TerrainRenderBounds,
  fillColor?: string,
): TerrainLiquidPalette | null {
  type Color = [number, number, number];
  const samples: Color[] = [];
  if (image && image.width > 0 && image.height > 0) {
    const rect = region ?? { x: 0, y: 0, width: image.width, height: image.height };
    const left = Math.max(0, Math.floor(rect.x)), top = Math.max(0, Math.floor(rect.y));
    const right = Math.min(image.width, Math.ceil(rect.x + rect.width));
    const bottom = Math.min(image.height, Math.ceil(rect.y + rect.height));
    const columns = Math.min(32, right - left), rows = Math.min(32, bottom - top);
    for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
      const sx = left + Math.floor((x + 0.5) * (right - left) / columns);
      const sy = top + Math.floor((y + 0.5) * (bottom - top) / rows);
      const i = (sy * image.width + sx) * 4;
      if (image.pixels[i + 3] >= 224) samples.push([image.pixels[i], image.pixels[i + 1], image.pixels[i + 2]]);
    }
  }
  if (!samples.length) {
    const fallback = parseLiquidColor(fillColor);
    if (!fallback) return null;
    samples.push(fallback);
  }
  // Quantized dominance avoids averaging complementary colors into grey.
  const bins = new Map<number, { count: number; sum: Color }>();
  for (const color of samples) {
    const key = (color[0] >> 5) * 64 + (color[1] >> 5) * 8 + (color[2] >> 5);
    const bin = bins.get(key) ?? { count: 0, sum: [0, 0, 0] };
    bin.count++;
    for (let c = 0; c < 3; c++) bin.sum[c] += color[c];
    bins.set(key, bin);
  }
  const dominant = [...bins.values()].sort((a, b) => b.count - a.count)[0];
  const base = dominant.sum.map(c => Math.round(c / dominant.count)) as Color;
  const saturation = (c: Color) => (Math.max(...c) - Math.min(...c)) / Math.max(1, Math.max(...c));
  const saturated = samples.filter(c => saturation(c) >= saturation(base) * 0.6);
  const accents = saturated.length ? saturated : samples;
  const luma = (c: Color) => c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
  accents.sort((a, b) => luma(a) - luma(b));
  const bright = accents[Math.floor((accents.length - 1) * 0.85)];
  const dark = accents[Math.floor((accents.length - 1) * 0.15)];
  return {
    base,
    highlight: bright.map(c => Math.min(255, Math.round(c * 1.12))) as Color,
    shadow: dark.map(c => Math.round(c * 0.45)) as Color,
  };
}

function parseLiquidColor(value?: string): [number, number, number] | null {
  if (!value) return null;
  const hex = value.trim().match(/^#([\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i);
  if (hex) {
    const text = hex[1].length === 3 ? [...hex[1]].map(c => c + c).join('') : hex[1].slice(0, 6);
    return [0, 2, 4].map(i => parseInt(text.slice(i, i + 2), 16)) as [number, number, number];
  }
  const rgb = value.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*[,)]|\s*\/)/i);
  return rgb ? rgb.slice(1, 4).map(c => Math.min(255, Number(c))) as [number, number, number] : null;
}
