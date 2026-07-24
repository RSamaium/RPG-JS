export const STUDIO_TERRAIN_TILE_SIZE = 48;

export type TerrainRenderMode =
  | { type: "hard" }
  | { type: "fade"; width?: number; curve?: "linear" | "smooth" | "sharp" }
  | { type: "water"; border?: boolean; foam?: boolean }
  | { type: "custom"; shaderKey: string; params?: Record<string, unknown> };

export interface TerrainTextureMetadata {
  id: string;
  index: number;
  label: string;
  collision?: boolean;
  renderTileSize?: number;
  specialType?: string;
  defaultRenderMode?: TerrainRenderMode;
}

export interface TerrainTextureGridMetadata {
  columns: number;
  rows: number;
  tileSize: number;
}

export interface TerrainTransitionRule {
  from: string;
  to: string;
  mode: TerrainRenderMode;
  priority?: number;
}

export interface TerrainAssetMetadata {
  sourceTexture: string;
  tileAtlas: TerrainTileAtlasMetadata | null;
  textureGrid: TerrainTextureGridMetadata;
  terrainTextures: TerrainTextureMetadata[];
  transitions: TerrainTransitionRule[];
}

export interface TerrainTileAtlasMetadata {
  source: string;
  tileWidth: number;
  tileHeight: number;
  columns?: number;
  tileCount?: number;
}

export interface StudioTerrainCell {
  source: "terrain-texture" | "tile-atlas";
  terrainTextureId: string;
  textureIndex: number;
  collision: boolean;
  tileId?: number;
}

export interface StudioTerrainStroke {
  id: string;
  points: Array<{ x: number; y: number }>;
  radius: number;
}

export interface StudioTerrainMorphologyOperation {
  mode: "paint" | "erase";
  stroke: StudioTerrainStroke;
}

/**
 * Extensible rendering parameters persisted on a Studio terrain morphology
 * feature. Wave overrides apply to filled holes and inherit map defaults when
 * omitted.
 */
export interface StudioTerrainMorphologyParams extends Record<string, unknown> {
  /** Filled-hole animation speed override, clamped from 0.1 to 4. */
  waveSpeed?: number;
  /** Filled-hole animation strength from 0 (static) to 1. */
  waveIntensity?: number;
  /** Clockwise screen-space travel angle in degrees: 0 right, 90 down. */
  waveDirection?: number;
}

export interface StudioTerrainMorphologyFeature {
  id: string;
  kind: "hole" | "wall";
  params: StudioTerrainMorphologyParams;
  strokes: StudioTerrainStroke[];
  eraserStrokes?: StudioTerrainStroke[];
  operations?: StudioTerrainMorphologyOperation[];
}

export interface StudioTerrainRenderBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Client-only invalidation data produced after an authoritative Studio stream
 * packet has been consolidated.
 */
export interface StudioTerrainStreamUpdate {
  /** Authoritative map revision represented by the active chunks. */
  revision: string;
  /** Monotonic client generation incremented once per consolidated packet. */
  generation: number;
  /** Terrain regions whose disclosed content changed in this generation. */
  dirtyRegions: StudioTerrainRenderBounds[];
  /** Terrain regions represented by all chunks currently retained by the client. */
  activeRegions: StudioTerrainRenderBounds[];
}

export interface StudioTerrainRenderData {
  widthTiles: number;
  heightTiles: number;
  tileSize: number;
  width: number;
  height: number;
  asset: TerrainAssetMetadata | null;
  sourceTexture: string;
  terrainControl: StudioTerrainControlTexture | null;
  terrainGrid: StudioTerrainCell[][];
  morphologyFeatures: StudioTerrainMorphologyFeature[];
  waterAnimation: StudioWaterAnimationOptions;
  version: string;
  /** Incremental invalidation state for streamed maps; absent for direct loads. */
  streamUpdate?: StudioTerrainStreamUpdate;
}

/**
 * Client-side visual settings for animated Studio liquids.
 * Filled terrain holes may override speed, intensity, and direction through
 * their morphology params without changing gameplay or server authority.
 */
export interface StudioWaterAnimationOptions {
  /** Whether painted water terrain receives the animated overlay. */
  enabled: boolean;
  /** Animation speed multiplier, clamped from 0.1 to 4. */
  speed: number;
  /** Overlay strength from 0 (static) to 1. */
  intensity: number;
  /** Clockwise screen-space travel angle in degrees: 0 right, 90 down. */
  direction: number;
}

export interface StudioTerrainControlTexture {
  source: string;
  width: number;
  height: number;
  tileSize: number;
  palette: string[];
  encoding?: string;
  /** Client-safe control-texture regions disclosed with the active map chunks. */
  regions?: StudioTerrainControlRegion[];
}

export interface StudioTerrainControlRegion {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  encoding: "rgba8-base64" | "rgba8-rle-base64";
  data: string;
}

export interface StudioCollisionPolygon {
  id: string;
  type:
    | "terrain_collision"
    | "morphology_hole_edge_collision"
    | "morphology_wall_edge_collision";
  x: number;
  y: number;
  width: number;
  height: number;
  points: Array<[number, number]>;
  properties?: Record<string, unknown>;
}

export interface TerrainSourceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
