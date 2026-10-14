import type { ElementLiquidRegion } from "../element-submersion";
import type {
  StudioTerrainControlRegion,
  StudioTerrainControlTexture,
  StudioTerrainMorphologyFeature,
  StudioTerrainRenderBounds,
  StudioTerrainRenderData,
} from "../types";
import type { TerrainChunkJob } from "./terrain-paint-backend";
import type { StudioTerrainWallShadowStyle } from "./terrain-painter";

/**
 * What goes between the page and the worker that draws the terrain.
 *
 * The data of a map is sent as it changes, not each time something is asked: the features of the relief and the regions of
 * the control texture are the heavy part, and the painter keeps what it made for each of them by the identity of the object,
 * so a feature that did not change is not sent again, and the worker keeps the very object it had.
 */
export interface TerrainWireData {
  /** Everything but the two lists below. */
  base: Omit<StudioTerrainRenderData, "morphologyFeatures" | "terrainControl">;
  control: (Omit<StudioTerrainControlTexture, "regions"> & { regions?: Array<{ id: number; region?: StudioTerrainControlRegion }> }) | null;
  features: Array<{ id: number; feature?: StudioTerrainMorphologyFeature }>;
}

export type TerrainWorkerRequest =
  | { type: "data"; context: number; data: TerrainWireData; reset: boolean; seq: number }
  /** `seq` is the number of the data the chunk is for: a chunk for data that another has replaced is not drawn. */
  | { type: "chunk"; context: number; id: number; seq: number; job: TerrainChunkJob }
  | { type: "wallOcclusion"; context: number; id: number; sliceWidth: number }
  | { type: "wallShadow"; context: number; id: number; style: StudioTerrainWallShadowStyle }
  | { type: "liquidContact"; context: number; id: number; bounds: StudioTerrainRenderBounds }
  | { type: "clear"; context: number }
  | { type: "destroy"; context: number };

/** A water region as it travels: its mask is a bitmap. */
export interface TerrainWireWaterRegion {
  mask: ImageBitmap;
  bounds: StudioTerrainRenderBounds;
  phase: number;
  speed: number;
  intensity: number;
  direction: number;
  seed: number;
}

export interface TerrainWireChunk {
  canvas: ImageBitmap;
  water: { regions: TerrainWireWaterRegion[]; overlayBounds: StudioTerrainRenderBounds; surface: ImageBitmap } | null;
}

export interface TerrainWirePiece {
  canvas: ImageBitmap;
  x: number;
  y: number;
  zIndex?: number;
  label: string;
}

export type TerrainWorkerResponse =
  | { type: "result"; id: number; value: TerrainWireChunk | TerrainWirePiece[] | ElementLiquidRegion | null }
  | { type: "error"; id: number; message: string };
