import { createCanvasElement } from "../canvas-env";
import type { StudioTerrainRenderData, StudioTerrainSet, TerrainAssetMetadata, TerrainTransitionRule } from "../types";
import { resolveEffectiveTerrainTextureGrid } from "./terrain-texture";

/** Separates the id of a terrain set from the id of a texture in a palette entry: `forest::grass`. */
export const TERRAIN_SET_SEPARATOR = "::";

/** A terrain set with the size of its picture, to plan the merged atlas. */
export interface TerrainSetImageSize {
  set: StudioTerrainSet;
  width: number;
  height: number;
}

/** Where the picture of a set goes in the merged atlas. */
export interface TerrainSetAtlasPlacement {
  setId: string;
  /** Top of the picture, in pixels. */
  y: number;
  width: number;
  height: number;
}

export interface TerrainSetAtlasPlan {
  /** The metadata of the merged atlas: the textures of every set, with ids that are unique. */
  asset: TerrainAssetMetadata;
  width: number;
  height: number;
  placements: TerrainSetAtlasPlacement[];
  /** The id a texture has in the merged atlas, from a palette entry: `grass` (the first set that has it) or `forest::grass`. */
  resolve(entry: string): string | undefined;
  /** Sets that could not join the atlas (a tile size that differs from the first set). */
  skipped: string[];
}

/**
 * Plans one atlas for several terrain sets: the pictures are stacked, each set keeps its tiles, and the textures get ids that
 * are unique across the sets: a texture keeps its own id unless an earlier set has it, in which case it is `set::texture`.
 * A palette entry is a plain id (the first set that has it) or a qualified one. The sets must share the tile size of the
 * first one; the others are left out and listed in `skipped`.
 */
export function planTerrainSetAtlas(sizes: readonly TerrainSetImageSize[]): TerrainSetAtlasPlan | null {
  if (sizes.length === 0) return null;
  const first = sizes[0];
  const firstGrid = resolveEffectiveTerrainTextureGrid(first.set.asset, first.width, first.height);
  const tileSize = firstGrid.tileSize;
  const skipped: string[] = [];
  const usable = sizes.filter((entry, index) => {
    if (index === 0) return true;
    const grid = resolveEffectiveTerrainTextureGrid(entry.set.asset, entry.width, entry.height);
    if (grid.tileSize === tileSize) return true;
    skipped.push(entry.set.id);
    return false;
  });
  const grids = usable.map((entry) => resolveEffectiveTerrainTextureGrid(entry.set.asset, entry.width, entry.height));
  const columns = Math.max(...grids.map((grid) => grid.columns));

  const textures: TerrainAssetMetadata["terrainTextures"] = [];
  const transitions: TerrainTransitionRule[] = [];
  const placements: TerrainSetAtlasPlacement[] = [];
  const taken = new Set<string>();
  const byEntry = new Map<string, string>();
  let rowOffset = 0;
  let nextIndex = 0;

  usable.forEach((entry, position) => {
    const grid = grids[position];
    const own = new Map<string, string>();
    for (const texture of entry.set.asset.terrainTextures) {
      const id = taken.has(texture.id) ? `${entry.set.id}${TERRAIN_SET_SEPARATOR}${texture.id}` : texture.id;
      taken.add(id);
      own.set(texture.id, id);
      byEntry.set(`${entry.set.id}${TERRAIN_SET_SEPARATOR}${texture.id}`, id);
      if (!byEntry.has(texture.id)) byEntry.set(texture.id, id);
      const tiles = Math.max(1, grid.columns * grid.rows);
      const source = ((Math.floor(texture.index) % tiles) + tiles) % tiles;
      const column = source % grid.columns;
      const row = Math.floor(source / grid.columns);
      textures.push({ ...texture, id, index: (rowOffset + row) * columns + column });
      nextIndex += 1;
    }
    for (const rule of entry.set.asset.transitions) {
      const from = own.get(rule.from), to = own.get(rule.to);
      if (from && to) transitions.push({ ...rule, from, to });
    }
    placements.push({ setId: entry.set.id, y: rowOffset * tileSize, width: entry.width, height: grid.rows * tileSize });
    rowOffset += grid.rows;
  });
  void nextIndex;

  const primary = first.set.asset;
  return {
    asset: {
      ...primary,
      textureGrid: { columns, rows: rowOffset, tileSize },
      terrainTextures: textures,
      transitions,
    },
    width: Math.max(...usable.map((entry) => entry.width), columns * tileSize),
    height: rowOffset * tileSize,
    placements,
    resolve: (entry) => byEntry.get(entry),
    skipped,
  };
}

const loadPageImage = (source: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    if (typeof Image === "undefined") return resolve(null);
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = source;
  });

/**
 * Makes one terrain atlas of the several terrain sets of a map, so the renderer (the page and the terrain workers) paints every
 * set from a single picture. A map with one set comes back as it is. The palette of the control texture is rewritten with the
 * ids of the merged atlas; an entry that no set has is kept as it is.
 *
 * @param data - The terrain render data of the map.
 * @param loadImage - Loads the picture of a set; `null` when it cannot (the map then keeps its first set).
 */
export async function mergeStudioTerrainSets(
  data: StudioTerrainRenderData,
  loadImage: (source: string) => Promise<{ width: number; height: number } | null> = loadPageImage,
): Promise<StudioTerrainRenderData> {
  const sets = data.terrainSets ?? [];
  if (sets.length < 2) return data;
  const images = await Promise.all(sets.map((set) => loadImage(set.sourceTexture)));
  const sizes: TerrainSetImageSize[] = [];
  const pictures: Array<{ width: number; height: number }> = [];
  sets.forEach((set, index) => {
    const image = images[index];
    if (!image) return;
    sizes.push({ set, width: image.width, height: image.height });
    pictures.push(image);
  });
  // the first set has to load: the others are drawn next to it
  if (sizes.length < 2 || sizes[0].set.id !== sets[0].id) return data;
  const plan = planTerrainSetAtlas(sizes);
  if (!plan) return data;

  const canvas = createCanvasElement(plan.width, plan.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return data;
  ctx.imageSmoothingEnabled = false;
  for (const placement of plan.placements) {
    const index = sizes.findIndex((entry) => entry.set.id === placement.setId);
    ctx.drawImage(pictures[index] as unknown as CanvasImageSource, 0, placement.y);
  }
  const sourceTexture = typeof canvas.toDataURL === "function" ? canvas.toDataURL("image/png") : "";
  if (!sourceTexture) return data;

  const control = data.terrainControl
    ? { ...data.terrainControl, palette: data.terrainControl.palette.map((entry) => plan.resolve(entry) ?? entry) }
    : null;
  // the sets are in the atlas now: the workers need not receive them
  const { terrainSets: _merged, ...rest } = data;
  return {
    ...rest,
    asset: plan.asset,
    sourceTexture,
    terrainControl: control,
    version: `${data.version}|sets:${sets.map((set) => set.id).join(",")}`,
  };
}
