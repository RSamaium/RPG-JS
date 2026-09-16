export interface RasterImage {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
}

export interface TerrainRenderBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TerrainRenderFrame extends TerrainRenderBounds {
  pixels: Uint8ClampedArray;
}

export interface TerrainNineSliceCenter {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type TerrainRenderMode =
  | { type: "hard" }
  | { type: "fade"; width?: number; curve?: "linear" | "smooth" | "sharp" }
  | { type: "nine-slice"; center: TerrainNineSliceCenter }
  | { type: "water"; border?: boolean; foam?: boolean }
  | { type: "custom"; shaderKey: string; params?: Record<string, unknown> };

export interface TerrainTextureDefinition {
  id: string;
  index: number;
  label: string;
  source?: string;
  sourceRect?: TerrainRenderBounds;
  collision?: boolean;
  priority?: number;
  renderTileSize?: number;
  renderingStyle?: "pixel-art" | "hd-2d";
  specialType?: string;
  defaultRenderMode?: TerrainRenderMode;
}

export interface TerrainTransitionRule {
  from: string;
  to: string;
  mode: TerrainRenderMode;
  priority?: number;
}

export interface TerrainControlTexture {
  source?: string;
  width: number;
  height: number;
  palette: string[];
  pixels?: Uint8ClampedArray;
}

export interface TerrainStroke {
  id: string;
  points: Array<{ x: number; y: number }>;
  radius: number;
}

export interface TerrainMorphologyFeature {
  id: string;
  kind: "hole" | "wall";
  params: Record<string, unknown>;
  strokes: TerrainStroke[];
  eraserStrokes?: TerrainStroke[];
  operations?: Array<{ mode: "paint" | "erase"; stroke: TerrainStroke }>;
}

export interface TerrainMapDocument {
  version: 1;
  width: number;
  height: number;
  tileSize: number;
  sourceTexture?: string;
  textureGrid: { columns: number; rows: number; tileSize: number };
  textures: TerrainTextureDefinition[];
  transitions: TerrainTransitionRule[];
  controlTexture?: TerrainControlTexture;
  terrain?: number[][];
  morphology: TerrainMorphologyFeature[];
  waterAnimation: { enabled: boolean; speed: number; intensity: number; direction: number };
}

export interface TerrainPresetInput {
  width: number;
  height: number;
  tileSize: number;
  mask: Uint8ClampedArray;
  params: Readonly<Record<string, unknown>>;
  /** World-space origin of the supplied buffers. */
  originX?: number;
  /** World-space origin of the supplied buffers. */
  originY?: number;
  timeMs?: number;
}

export type TerrainPresetRenderer = (input: TerrainPresetInput) => Uint8ClampedArray;

export interface PrepareTerrainMapInput {
  map: TerrainMapDocument;
  textures: Record<string, RasterImage>;
  presets?: Record<string, TerrainPresetRenderer>;
}

export interface PreparedTerrainMap {
  readonly map: TerrainMapDocument;
  readonly textures: Readonly<Record<string, RasterImage>>;
  readonly presets: Readonly<Record<string, TerrainPresetRenderer>>;
  readonly disposed: boolean;
}
