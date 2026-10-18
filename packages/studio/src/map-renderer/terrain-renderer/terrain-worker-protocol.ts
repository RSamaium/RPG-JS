import type { StudioCollisionPolygon, StudioTerrainRenderData } from "../types";

export type TerrainWorkerBounds = { x: number; y: number; width: number; height: number };

export type TerrainWorkerRequest =
  | {
      type: "init";
      data: StudioTerrainRenderData;
      collisions: StudioCollisionPolygon[];
      splitWallForeground: boolean;
    }
  | { type: "paint"; requestId: number; bounds: TerrainWorkerBounds };

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

export type TerrainWorkerResponse =
  | { type: "painted"; requestId: number; bitmap: ImageBitmap; water?: TerrainWorkerWater }
  | { type: "error"; requestId: number; message: string };
