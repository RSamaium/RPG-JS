import type { StudioCollisionPolygon, StudioTerrainRenderData } from "../types";
import type { StudioTerrainWallShadowStyle } from "./terrain-chunk-painter";

export type TerrainWorkerBounds = { x: number; y: number; width: number; height: number };

export type TerrainWorkerRequest =
  | {
      type: "init";
      data: StudioTerrainRenderData;
      collisions: StudioCollisionPolygon[];
      splitWallForeground: boolean;
    }
  | { type: "paint"; requestId: number; bounds: TerrainWorkerBounds }
  | { type: "walls-occlusion"; requestId: number; data: StudioTerrainRenderData; sliceWidth: number }
  | { type: "walls-shadow"; requestId: number; data: StudioTerrainRenderData; style: StudioTerrainWallShadowStyle };

export interface TerrainWorkerWater {
  overlayBounds: TerrainWorkerBounds;
  surface: ImageBitmap;
  regions: Array<{
    mask: ImageBitmap;
    bounds: TerrainWorkerBounds;
    phase: number;
    speed: number;
    intensity: number;
    direction: number;
    seed: number;
  }>;
}

export interface TerrainWorkerWallSlice {
  bitmap: ImageBitmap;
  x: number;
  y: number;
  zIndex: number;
  label: string;
}

export type TerrainWorkerResponse =
  | { type: "painted"; requestId: number; bitmap: ImageBitmap; water?: TerrainWorkerWater }
  | { type: "walls"; requestId: number; slices: TerrainWorkerWallSlice[] }
  | { type: "error"; requestId: number; message: string };
