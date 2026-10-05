import type { RasterImage, TerrainMapDocument, TerrainRenderMode } from "@rpgjs/render-map2d";
import type { MapPatch } from "../model/patches";
import { readAll, shapeBounds } from "./mask";
import type { WorldRect } from "./scheduler";
import { NO_MATERIAL, type MaskRect, type TerrainData, type TerrainMode } from "./types";

/**
 * What the terrain feature feeds the kernel (`@rpgjs/render-map2d`) with. Types only: this file
 * never imports the kernel at runtime, so the data model stays usable without it.
 */

/** Where a material's texture comes from: the decoded image, and the part of it to use. */
export interface MaterialSource {
  readonly src: string;
  readonly frame?: readonly [x: number, y: number, width: number, height: number];
}

/** A message-friendly description of the terrain to render. */
export interface TerrainRenderInit {
  readonly data: TerrainData;
  /** World size, in pixels. */
  readonly size: readonly [width: number, height: number];
  readonly tileSize: number;
  /** By material id. */
  readonly sources: { readonly [materialId: string]: MaterialSource };
  /** Decoded images, by `src`. */
  readonly images: { readonly [src: string]: RasterImage };
}

const DEFAULT_BLEND = 18;
const WATER_BLEND = 16;

/** How far a material's mode blends into its surroundings, in pixels. */
export function blendRadius(mode: TerrainMode | undefined): number {
  if (!mode) return DEFAULT_BLEND;
  switch (mode.type) {
    case "hard":
    case "nine-slice":
      return 0;
    case "fade":
      return typeof mode.width === "number" && mode.width > 0 ? mode.width : DEFAULT_BLEND;
    case "water":
      return mode.border === false ? 8 : WATER_BLEND;
    case "custom": {
      const width = Number(mode.params?.blendRadius ?? mode.params?.width);
      return Number.isFinite(width) && width >= 0 ? width : DEFAULT_BLEND;
    }
  }
}

/**
 * The widest blend of the terrain: a changed mask changes pixels this far around it, and rendering a
 * region exactly needs this much context around it. `undefined` when the terrain has features whose
 * reach is not known here (morphology): the kernel's own, wider margin must then be used.
 */
export function widestBlend(data: TerrainData): number | undefined {
  if (data.morphology && data.morphology.length > 0) return undefined;
  let widest = 0;
  for (const material of data.materials) widest = Math.max(widest, blendRadius(material.mode));
  for (const transition of data.transitions ?? []) widest = Math.max(widest, blendRadius(transition.mode));
  // A few pixels more for the tails of the soft mask.
  return Math.ceil(widest) + 8;
}

/** The mask as the kernel's control image: material index in red and green, opaque where something is painted. */
export function controlPixels(data: TerrainData): Uint8ClampedArray {
  const values = readAll(data.mask);
  const pixels = new Uint8ClampedArray(values.length * 4);
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i]!;
    pixels[i * 4] = value & 255;
    pixels[i * 4 + 1] = value >> 8;
    pixels[i * 4 + 3] = value === NO_MATERIAL ? 0 : 255;
  }
  return pixels;
}

/** Writes values over a rectangle of a control image (what `terrain.paint` and `terrain.region` change). */
export function writeControl(pixels: Uint8ClampedArray, maskWidth: number, rect: MaskRect, values: ArrayLike<number>): void {
  for (let y = 0; y < rect.height; y += 1) {
    for (let x = 0; x < rect.width; x += 1) {
      const value = values[y * rect.width + x]!;
      const offset = ((rect.y + y) * maskWidth + rect.x + x) * 4;
      pixels[offset] = value & 255;
      pixels[offset + 1] = value >> 8;
      pixels[offset + 2] = 0;
      pixels[offset + 3] = value === NO_MATERIAL ? 0 : 255;
    }
  }
}

const toKernelMode = (mode: TerrainMode | undefined): TerrainRenderMode | undefined => mode as TerrainRenderMode | undefined;

/** The document the kernel renders. `controlPixels` is the control image, kept up to date by the caller. */
export function toKernelDocument(init: TerrainRenderInit, control: Uint8ClampedArray): TerrainMapDocument {
  const { data } = init;
  return {
    version: 1,
    width: init.size[0],
    height: init.size[1],
    tileSize: init.tileSize,
    textureGrid: { columns: 1, rows: 1, tileSize: 1 },
    textures: data.materials.map((material, index) => {
      const source = init.sources[material.id];
      const image = source ? init.images[source.src] : undefined;
      const frame = source?.frame ?? (image ? [0, 0, image.width, image.height] as const : undefined);
      return {
        id: material.id,
        index,
        label: material.id,
        ...(source ? { source: source.src } : {}),
        ...(frame ? { sourceRect: { x: frame[0], y: frame[1], width: frame[2], height: frame[3] } } : {}),
        ...(material.priority !== undefined ? { priority: material.priority } : { priority: index }),
        ...(material.collision !== undefined ? { collision: material.collision } : {}),
        ...(material.specialType !== undefined ? { specialType: material.specialType } : {}),
        ...(material.renderTileSize !== undefined ? { renderTileSize: material.renderTileSize } : {}),
        ...(material.renderingStyle !== undefined ? { renderingStyle: material.renderingStyle } : {}),
        ...(toKernelMode(material.mode) ? { defaultRenderMode: toKernelMode(material.mode)! } : {}),
      };
    }),
    transitions: (data.transitions ?? []).map((rule) => ({ from: rule.from, to: rule.to, mode: toKernelMode(rule.mode)!, ...(rule.priority !== undefined ? { priority: rule.priority } : {}) })),
    controlTexture: { width: data.mask.width, height: data.mask.height, palette: data.materials.map((m) => m.id), pixels: control },
    morphology: (data.morphology ?? []) as unknown as TerrainMapDocument["morphology"],
    waterAnimation: data.water ?? { enabled: false, speed: 1, intensity: 1, direction: 0 },
  };
}

/** What to render again after a patch, in world pixels. `"all"` when the patch can change anything. */
export function dirtyOfPatch(patch: MapPatch, data: TerrainData, grow: number): WorldRect | "all" | "none" {
  const scale = data.mask.scale;
  const fromMask = (rect: MaskRect | undefined): WorldRect | "none" =>
    rect ? growRect({ x: rect.x * scale, y: rect.y * scale, width: rect.width * scale, height: rect.height * scale }, grow) : "none";
  switch (patch.type) {
    case "terrain.paint":
      return fromMask(shapeBounds(data.mask, patch.shape));
    case "terrain.region":
      return fromMask({ x: patch.x, y: patch.y, width: patch.width, height: patch.height });
    case "terrain.materials":
    case "terrain.morphology":
    case "extension.set":
      return "all";
    default:
      return "none";
  }
}

export const growRect = (rect: WorldRect, by: number): WorldRect => ({ x: rect.x - by, y: rect.y - by, width: rect.width + by * 2, height: rect.height + by * 2 });
