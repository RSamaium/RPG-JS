import { resolveTerrainLiquidPalette, type TerrainLiquidPalette } from "./liquid";
import type { TerrainPresetRenderer } from "./types";
import { createTerrainRoadTownOverlayPixels } from "./road";

export const CARPET_BORDER_SHADER_KEY = "carpet-border";

export function isTerrainCarpetMode(mode: import("./types").TerrainRenderMode): boolean {
  return mode.type === "custom" && mode.shaderKey === CARPET_BORDER_SHADER_KEY;
}

export const TerrainPreset = {
  GrassEdge: "grass-edge",
  Carpet: "carpet",
  Water: "water",
  RoadTownSidewalk: "road-town-sidewalk",
  RoadTownMarked: "road-town-marked",
} as const;

export const renderGrassEdgePreset: TerrainPresetRenderer = ({ width, height, mask }) => {
  const output = new Uint8ClampedArray(mask.length);
  for (let index = 0; index < width * height; index += 1) {
    if (!occupied(mask, index) || !isBoundary(mask, width, height, index)) continue;
    output.set([216, 236, 133, 48], index * 4);
  }
  return output;
};

const waterPaletteCache = new WeakMap<Uint8ClampedArray, Map<string, TerrainLiquidPalette | null>>();

export const renderWaterPreset: TerrainPresetRenderer = ({
  width,
  height,
  mask,
  params,
  originX = 0,
  originY = 0,
  timeMs,
  source,
}) => {
  const output = new Uint8ClampedArray(mask.length);
  const fillColor = typeof params.fillColor === "string" ? params.fillColor : undefined;
  const cache = source ? waterPaletteCache.get(source.pixels) ?? new Map<string, TerrainLiquidPalette | null>() : undefined;
  const key = `${source?.width}:${source?.height}:${fillColor ?? ""}`;
  const palette = cache?.has(key) ? cache.get(key)! : resolveTerrainLiquidPalette(source, undefined, fillColor);
  if (source && cache) {
    cache.set(key, palette);
    waterPaletteCache.set(source.pixels, cache);
  }
  if (!palette) return output;
  const speed = finiteNumber(params.speed, 1);
  const intensity = finiteNumber(params.intensity, 0.35);
  const animated = params.enabled !== false && timeMs !== undefined;
  for (let index = 0; index < width * height; index += 1) {
    if (!occupied(mask, index)) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    const phase = (originY + y) * width + originX + x;
    const wave = animated ? Math.sin(timeMs * 0.002 * speed + phase * 0.05) * intensity : 0;
    const offset = index * 4;
    const edge = isBoundary(mask, width, height, index) && params.border !== false;
    const color = params.foam === false ? palette.shadow : palette.highlight;
    for (let c = 0; c < 3; c++) output[offset + c] = color[c] * (1 + wave * 0.06);
    output[offset + 3] = edge ? (params.foam === false ? 45 : 70 + Math.sin(phase * 0.11) * 25) : 0;
  }
  return output;
};

function occupied(mask: Uint8ClampedArray, index: number): boolean {
  return mask[index * 4 + 3] >= 32;
}

function boundaryDistance(mask: Uint8ClampedArray, width: number, height: number): Uint16Array {
  const count = width * height;
  const distance = new Uint16Array(count);
  distance.fill(0xffff);
  const queue = new Int32Array(count);
  let read = 0;
  let write = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (!occupied(mask, index)) continue;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1
        || !occupied(mask, index - 1) || !occupied(mask, index + 1)
        || !occupied(mask, index - width) || !occupied(mask, index + width)) {
        distance[index] = 0;
        queue[write++] = index;
      }
    }
  }
  while (read < write) {
    const index = queue[read++];
    const next = distance[index] + 1;
    const x = index % width;
    const y = Math.floor(index / width);
    const neighbors = [x > 0 ? index - 1 : -1, x + 1 < width ? index + 1 : -1,
      y > 0 ? index - width : -1, y + 1 < height ? index + width : -1];
    for (const neighbor of neighbors) {
      if (neighbor < 0 || !occupied(mask, neighbor) || distance[neighbor] <= next) continue;
      distance[neighbor] = next;
      queue[write++] = neighbor;
    }
  }
  return distance;
}

function setPixel(output: Uint8ClampedArray, index: number, color: readonly number[], alpha = 1): void {
  const offset = index * 4;
  output[offset] = color[0];
  output[offset + 1] = color[1];
  output[offset + 2] = color[2];
  output[offset + 3] = Math.round((color[3] ?? 255) * alpha);
}

export const renderCarpetPreset: TerrainPresetRenderer = ({ width, height, mask, tileSize }) => {
  const output = new Uint8ClampedArray(width * height * 4);
  const distance = boundaryDistance(mask, width, height);
  const outer = Math.max(2, Math.round(tileSize * 0.1));
  const highlight = Math.max(1, Math.round(tileSize * 0.05));
  for (let index = 0; index < distance.length; index += 1) {
    if (distance[index] < outer) setPixel(output, index, [20, 20, 20, 155]);
    else if (distance[index] < outer + highlight) setPixel(output, index, [250, 250, 250, 72]);
  }
  return output;
};

export const renderRoadTownSidewalkPreset: TerrainPresetRenderer = (input) =>
  createTerrainRoadTownOverlayPixels({ ...input, marked: false });
export const renderRoadTownMarkedPreset: TerrainPresetRenderer = (input) =>
  createTerrainRoadTownOverlayPixels({ ...input, marked: true });

export function createTerrainCarpetBorderOverlayPixels(input: {
  width: number; height: number; tileSize: number; mask: Uint8ClampedArray;
}): Uint8ClampedArray {
  return renderCarpetPreset({ ...input, params: {} });
}

export const builtInTerrainPresets: Readonly<Record<string, TerrainPresetRenderer>> = {
  [TerrainPreset.GrassEdge]: renderGrassEdgePreset,
  [TerrainPreset.Carpet]: renderCarpetPreset,
  [TerrainPreset.Water]: renderWaterPreset,
  [CARPET_BORDER_SHADER_KEY]: renderCarpetPreset,
  [TerrainPreset.RoadTownSidewalk]: renderRoadTownSidewalkPreset,
  [TerrainPreset.RoadTownMarked]: renderRoadTownMarkedPreset,
};

function isBoundary(mask: Uint8ClampedArray, width: number, height: number, index: number): boolean {
  const x = index % width;
  const y = Math.floor(index / width);
  return x === 0 || y === 0 || x === width - 1 || y === height - 1
    || !occupied(mask, index - 1) || !occupied(mask, index + 1)
    || !occupied(mask, index - width) || !occupied(mask, index + width);
}

function finiteNumber(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
