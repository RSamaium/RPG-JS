export { buildStudioTerrainCollisionPolygons } from "./collision-polygons";
export { createStudioTerrainRenderData, normalizeMorphologyFeatures } from "./map-normalizer";
export { StudioTerrainChunkRenderer, setStudioTerrainChunkSize } from "./terrain-renderer/terrain-chunk-renderer";
export type {
  StudioCollisionPolygon,
  StudioTerrainCell,
  StudioTerrainMorphologyFeature,
  StudioTerrainRenderBounds,
  StudioTerrainRenderData,
  StudioTerrainStreamUpdate,
} from "./types";
