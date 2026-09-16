import { TerrainMapValidationError } from "./error";
import type {
  TerrainControlTexture,
  TerrainMapDocument,
  TerrainMorphologyFeature,
  TerrainRenderMode,
  TerrainStroke,
  TerrainTextureDefinition,
  TerrainTransitionRule,
} from "./types";

type UnknownRecord = Record<string, unknown>;

export function normalizeTerrainMap(input: unknown): TerrainMapDocument {
  const source = record(input, "$", true);
  const params = record(source.params, "$.params");
  const terrainLayer = record(source.terrainLayer, "$.terrainLayer");
  const morphologyLayer = record(source.terrainMorphologyLayer, "$.terrainMorphologyLayer");
  const assetSource = resolveTerrainAsset(params);
  const metadata = record(assetSource.metadata, "$.params.terrain.metadata");
  const tileSize = positiveNumber(terrainLayer.tileSize)
    ?? positiveNumber(morphologyLayer.tileSize)
    ?? positiveNumber(metadata.terrainTileSize)
    ?? 48;
  const width = positiveNumber(terrainLayer.width)
    ?? positiveNumber(morphologyLayer.width)
    ?? Math.max(1, integer(params.width) ?? 50) * tileSize;
  const height = positiveNumber(terrainLayer.height)
    ?? positiveNumber(morphologyLayer.height)
    ?? Math.max(1, integer(params.height) ?? 50) * tileSize;
  const grid = normalizeGrid(metadata, tileSize);
  const textures = normalizeTextures(metadata.terrainTextures, grid, metadata);
  const transitions = normalizeTransitions(metadata.transitions);
  const controlTexture = normalizeControlTexture(terrainLayer, width, height);
  const terrain = normalizeTerrainGrid(source.terrain, width, height, tileSize);

  return {
    version: 1,
    width,
    height,
    tileSize,
    sourceTexture: stringValue(metadata.sourceTexture)
      ?? stringValue(assetSource.fileName)
      ?? stringValue(metadata.fileName),
    textureGrid: grid,
    textures,
    transitions,
    ...(controlTexture ? { controlTexture } : {}),
    ...(terrain ? { terrain } : {}),
    morphology: normalizeMorphology(morphologyLayer.features),
    waterAnimation: normalizeWaterAnimation(source.waterAnimation),
  };
}

function resolveTerrainAsset(params: UnknownRecord): UnknownRecord {
  const list = Array.isArray(params.terrainTilesets)
    ? params.terrainTilesets.filter(isRecord) as UnknownRecord[]
    : [];
  const primary = idOf(params.primaryTerrainTileset) ?? idOf(params.baseTerrain);
  const explicitPrimary = isRecord(params.primaryTerrainTileset) ? params.primaryTerrainTileset : undefined;
  const explicitBase = isRecord(params.baseTerrain) ? params.baseTerrain : undefined;
  return list.find((item) => idOf(item) === primary)
    ?? list[0]
    ?? explicitPrimary
    ?? explicitBase
    ?? {};
}

function normalizeGrid(metadata: UnknownRecord, fallback: number): TerrainMapDocument["textureGrid"] {
  const grid = record(metadata.textureGrid, "$.textureGrid");
  return {
    columns: positiveInteger(grid.columns) ?? positiveInteger(metadata.terrainAtlasColumns) ?? 1,
    rows: positiveInteger(grid.rows) ?? positiveInteger(metadata.terrainAtlasRows) ?? 1,
    tileSize: positiveNumber(grid.tileSize) ?? positiveNumber(metadata.terrainTileSize) ?? fallback,
  };
}

function normalizeTextures(
  value: unknown,
  grid: TerrainMapDocument["textureGrid"],
  metadata: UnknownRecord,
): TerrainTextureDefinition[] {
  const input = Array.isArray(value) ? value : [];
  const count = Math.max(input.length, grid.columns * grid.rows);
  return Array.from({ length: count }, (_, index) => {
    const texture = isRecord(input[index]) ? input[index] : {};
    const textureIndex = nonNegativeInteger(texture.index) ?? index;
    return {
      id: stringValue(texture.id) ?? `terrain-${textureIndex}`,
      index: textureIndex,
      label: stringValue(texture.label) ?? stringValue(texture.name) ?? `Terrain ${textureIndex + 1}`,
      ...(stringValue(texture.source) ? { source: stringValue(texture.source) } : {}),
      ...(normalizeBounds(texture.sourceRect) ? { sourceRect: normalizeBounds(texture.sourceRect)! } : {}),
      ...(texture.collision === true ? { collision: true } : {}),
      ...(numberValue(texture.priority) !== undefined ? { priority: numberValue(texture.priority) } : {}),
      ...(positiveNumber(texture.renderTileSize) ? { renderTileSize: positiveNumber(texture.renderTileSize) } : {}),
      ...(texture.renderingStyle === "hd-2d" || texture.renderingStyle === "pixel-art"
        ? { renderingStyle: texture.renderingStyle } : {}),
      ...(stringValue(texture.specialType) ? { specialType: stringValue(texture.specialType) } : {}),
      ...(normalizeRenderMode(texture.defaultRenderMode ?? texture.renderMode)
        ? { defaultRenderMode: normalizeRenderMode(texture.defaultRenderMode ?? texture.renderMode) } : {}),
    };
  });
}

function normalizeTransitions(value: unknown): TerrainTransitionRule[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const from = stringValue(entry.from);
    const to = stringValue(entry.to);
    const mode = normalizeRenderMode(entry.mode);
    if (!from || !to || !mode) return [];
    return [{ from, to, mode, ...(numberValue(entry.priority) !== undefined ? { priority: numberValue(entry.priority) } : {}) }];
  });
}

function normalizeControlTexture(layer: UnknownRecord, width: number, height: number): TerrainControlTexture | undefined {
  if (layer.mode !== "control-texture") return undefined;
  const control = record(layer.controlTexture, "$.terrainLayer.controlTexture");
  const source = stringValue(control.source) ?? stringValue(control.src) ?? stringValue(control.fileName);
  const pixels = control.pixels instanceof Uint8ClampedArray ? control.pixels : undefined;
  if (!source && !pixels) return undefined;
  return {
    ...(source ? { source } : {}),
    width: positiveInteger(layer.width) ?? width,
    height: positiveInteger(layer.height) ?? height,
    palette: Array.isArray(layer.palette) ? layer.palette.map(String) : [],
    ...(pixels ? { pixels } : {}),
  };
}

function normalizeTerrainGrid(value: unknown, width: number, height: number, tileSize: number): number[][] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const columns = Math.max(1, Math.ceil(width / tileSize));
  const rows = Math.max(1, Math.ceil(height / tileSize));
  if (Array.isArray(value[0])) {
    return Array.from({ length: rows }, (_, y) => Array.from({ length: columns }, (_, x) => nonNegativeInteger((value[y] as unknown[])?.[x]) ?? 0));
  }
  return Array.from({ length: rows }, (_, y) => Array.from({ length: columns }, (_, x) => nonNegativeInteger(value[y * columns + x]) ?? 0));
}

function normalizeMorphology(value: unknown): TerrainMorphologyFeature[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    if (!isRecord(entry) || (entry.kind !== "hole" && entry.kind !== "wall")) return [];
    const strokes = normalizeStrokes(entry.strokes);
    if (strokes.length === 0) return [];
    const eraserStrokes = normalizeStrokes(entry.eraserStrokes);
    const operations: NonNullable<TerrainMorphologyFeature["operations"]> = Array.isArray(entry.operations) ? entry.operations.flatMap((operation): NonNullable<TerrainMorphologyFeature["operations"]> => {
      if (!isRecord(operation) || (operation.mode !== "paint" && operation.mode !== "erase")) return [];
      const stroke = normalizeStroke(operation.stroke, 0);
      return stroke ? [{ mode: operation.mode as "paint" | "erase", stroke }] : [];
    }) : [];
    return [{
      id: stringValue(entry.id) ?? `${entry.kind}-${index}`,
      kind: entry.kind,
      params: isRecord(entry.params) ? entry.params : {},
      strokes,
      ...(eraserStrokes.length ? { eraserStrokes } : {}),
      ...(operations.length ? { operations } : {}),
    }];
  });
}

function normalizeStrokes(value: unknown): TerrainStroke[] {
  return Array.isArray(value)
    ? value.map(normalizeStroke).filter((stroke): stroke is TerrainStroke => Boolean(stroke))
    : [];
}

function normalizeStroke(value: unknown, index = 0): TerrainStroke | undefined {
  if (!isRecord(value) || !Array.isArray(value.points)) return undefined;
  const points = value.points.flatMap((point) => isRecord(point) && numberValue(point.x) !== undefined && numberValue(point.y) !== undefined
    ? [{ x: numberValue(point.x)!, y: numberValue(point.y)! }] : []);
  if (!points.length) return undefined;
  return { id: stringValue(value.id) ?? `stroke-${index}`, points, radius: positiveNumber(value.radius) ?? 1 };
}

function normalizeWaterAnimation(value: unknown): TerrainMapDocument["waterAnimation"] {
  const source = record(value, "$.waterAnimation");
  return {
    enabled: source.enabled !== false,
    speed: clamp(numberValue(source.speed) ?? 1, 0.1, 4),
    intensity: clamp(numberValue(source.intensity) ?? 0.35, 0, 1),
    direction: numberValue(source.direction) ?? 0,
  };
}

function normalizeRenderMode(value: unknown): TerrainRenderMode | undefined {
  if (!isRecord(value)) return undefined;
  if (value.type === "hard") return { type: "hard" };
  if (value.type === "fade") return {
    type: "fade",
    ...(positiveNumber(value.width) ? { width: positiveNumber(value.width) } : {}),
    ...(value.curve === "linear" || value.curve === "smooth" || value.curve === "sharp" ? { curve: value.curve } : {}),
  };
  if (value.type === "water") return { type: "water", border: value.border !== false, foam: value.foam !== false };
  if (value.type === "custom" && stringValue(value.shaderKey)) return {
    type: "custom", shaderKey: stringValue(value.shaderKey)!, params: isRecord(value.params) ? value.params : {},
  };
  if (value.type === "nine-slice") {
    const center = normalizeBounds(value.center);
    if (center) return { type: "nine-slice", center };
  }
  return undefined;
}

function normalizeBounds(value: unknown): { x: number; y: number; width: number; height: number } | undefined {
  if (!isRecord(value)) return undefined;
  const x = nonNegativeInteger(value.x);
  const y = nonNegativeInteger(value.y);
  const width = positiveInteger(value.width);
  const height = positiveInteger(value.height);
  return x !== undefined && y !== undefined && width && height ? { x, y, width, height } : undefined;
}

function record(value: unknown, path: string, required = false): UnknownRecord {
  if (isRecord(value)) return value;
  if (required) throw new TerrainMapValidationError(path, "expected an object");
  return {};
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function stringValue(value: unknown): string | undefined { return typeof value === "string" && value.trim() ? value.trim() : undefined; }
function numberValue(value: unknown): number | undefined { const result = Number(value); return Number.isFinite(result) ? result : undefined; }
function integer(value: unknown): number | undefined { const result = numberValue(value); return result === undefined ? undefined : Math.floor(result); }
function positiveNumber(value: unknown): number | undefined { const result = numberValue(value); return result !== undefined && result > 0 ? result : undefined; }
function positiveInteger(value: unknown): number | undefined { const result = integer(value); return result !== undefined && result > 0 ? result : undefined; }
function nonNegativeInteger(value: unknown): number | undefined { const result = integer(value); return result !== undefined && result >= 0 ? result : undefined; }
function idOf(value: unknown): string | undefined { return stringValue(value) ?? (isRecord(value) ? stringValue(value._id) ?? stringValue(value.id) : undefined); }
function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }
