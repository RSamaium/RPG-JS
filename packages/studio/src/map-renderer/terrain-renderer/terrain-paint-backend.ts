import type { ElementLiquidRegion } from "../element-submersion";
import type { StudioCollisionPolygon, StudioTerrainRenderBounds, StudioTerrainRenderData } from "../types";
import type { StudioTerrainWallShadowStyle, TerrainWaterRegion } from "./terrain-painter";
import type { TerrainPaintedImage } from "./terrain-canvas";

/** One chunk to draw. */
export interface TerrainChunkJob {
  key: string;
  bounds: StudioTerrainRenderBounds;
  collisions: StudioCollisionPolygon[];
  splitWallForeground: boolean;
  /** Only some chunks are drawn again (a stroke touched them): the relief is made for them and their surroundings. */
  clip: StudioTerrainRenderBounds | null;
}

/** What the animation of the water is made from, over a chunk: the part of the chunk that is water, and the regions that move. */
export interface TerrainWaterPaint {
  regions: TerrainWaterRegion[];
  overlayBounds: StudioTerrainRenderBounds;
  surface: TerrainPaintedImage;
}

export interface TerrainChunkPaint {
  canvas: TerrainPaintedImage;
  water: TerrainWaterPaint | null;
}

/** A slice of a wall that goes over the characters, with where to put it. */
export interface TerrainWallOcclusionPiece {
  canvas: TerrainPaintedImage;
  x: number;
  y: number;
  zIndex: number;
  label: string;
}

/** The shadow a wall casts, with where to put it. */
export interface TerrainWallShadowPiece {
  canvas: TerrainPaintedImage;
  x: number;
  y: number;
  label: string;
}

/**
 * Where the pixels of the terrain are made: in the page, or in a worker. A renderer asks and puts what comes back on the
 * screen; it does not know which.
 */
export interface TerrainPaintBackend {
  /**
   * The data the next chunks are drawn from. With `reset`, what was made for the data before is forgotten (but the relief
   * of the features that did not change: a feature that changed is another object).
   */
  setData(data: StudioTerrainRenderData, reset: boolean): void;
  paintChunk(job: TerrainChunkJob): Promise<TerrainChunkPaint | null>;
  paintWallOcclusion(data: StudioTerrainRenderData, sliceWidth: number): Promise<TerrainWallOcclusionPiece[]>;
  paintWallShadow(data: StudioTerrainRenderData, style: StudioTerrainWallShadowStyle): Promise<TerrainWallShadowPiece[]>;
  paintLiquidContact(data: StudioTerrainRenderData, bounds: StudioTerrainRenderBounds): Promise<ElementLiquidRegion | null>;
  clearCaches(): void;
  destroy(): void;
}
