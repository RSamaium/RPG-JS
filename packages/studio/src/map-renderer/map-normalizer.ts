import { resolveAssetSource } from "../spritesheet-utils";
import {
  STUDIO_TERRAIN_TILE_SIZE,
  type StudioTerrainCell,
  type StudioTerrainControlTexture,
  type StudioTerrainMorphologyFeature,
  type StudioTerrainMorphologyOperation,
  type StudioTerrainRenderData,
  type StudioWaterAnimationOptions,
} from "./types";
import {
  findTerrainTexture,
  normalizeTerrainAssetMetadata,
} from "./terrain-renderer/terrain-texture";

export function createStudioTerrainRenderData(map: any): StudioTerrainRenderData {
  const params = map?.params ?? {};
  const terrainLayer = parseObject(map?.terrainLayer);
  const morphologyLayer = parseObject(map?.terrainMorphologyLayer);
  const tileSize =
    positiveNumber(terrainLayer?.tileSize) ??
    positiveNumber(morphologyLayer?.tileSize) ??
    STUDIO_TERRAIN_TILE_SIZE;
  const fallbackWidth = Math.max(1, Math.floor(Number(params.width) || 50)) * tileSize;
  const fallbackHeight = Math.max(1, Math.floor(Number(params.height) || 50)) * tileSize;
  const width = positiveNumber(terrainLayer?.width) ?? positiveNumber(morphologyLayer?.width) ?? fallbackWidth;
  const height = positiveNumber(terrainLayer?.height) ?? positiveNumber(morphologyLayer?.height) ?? fallbackHeight;
  const widthTiles = Math.max(1, Math.ceil(width / tileSize));
  const heightTiles = Math.max(1, Math.ceil(height / tileSize));
  const terrainAssetSource = resolvePrimaryTerrainAsset(params);
  const asset = normalizeTerrainAssetMetadata(terrainAssetSource);
  const useTileAtlas = shouldRenderTerrainAsTileAtlas(map, asset);
  const terrainSource = useTileAtlas
    ? asset?.tileAtlas?.source ?? asset?.sourceTexture
    : asset?.sourceTexture;
  const sourceTexture = terrainSource ? resolveAssetSource(terrainSource) : "";
  const terrainControl = normalizeTerrainControlTexture(
    terrainLayer,
    asset,
    width,
    height,
    tileSize
  );
  const terrainGrid = resolveTerrainGrid(map, asset, widthTiles, heightTiles, useTileAtlas);
  const morphologyFeatures = normalizeMorphologyFeatures(map?.terrainMorphologyLayer);
  const waterAnimation = normalizeWaterAnimationOptions(map?.waterAnimation);

  return {
    widthTiles,
    heightTiles,
    tileSize,
    width,
    height,
    asset,
    sourceTexture,
    terrainControl,
    terrainGrid,
    morphologyFeatures,
    waterAnimation,
    version: [
      map?._id ?? map?.id ?? "",
      JSON.stringify(map?.terrain ?? ""),
      JSON.stringify(map?.terrainByTileset ?? ""),
      JSON.stringify(map?.terrainLayer ?? ""),
      JSON.stringify(map?.terrainMorphologyLayer ?? ""),
      JSON.stringify(waterAnimation),
      JSON.stringify(params?.baseTerrain?.updatedAt ?? ""),
      JSON.stringify(params?.primaryTerrainTileset?.updatedAt ?? ""),
      terrainControl?.source ?? "",
    ].join("|"),
  };
}

function resolvePrimaryTerrainAsset(params: any): any {
  const terrainTilesets = normalizeList(params.terrainTilesets);
  const primaryId = resolveId(params.primaryTerrainTileset) || resolveId(params.baseTerrain);
  return (
    (primaryId
      ? terrainTilesets.find((tileset) => resolveId(tileset) === primaryId)
      : null) ??
    terrainTilesets[0] ??
    params.primaryTerrainTileset ??
    params.baseTerrain ??
    null
  );
}

function resolveTerrainGrid(
  map: any,
  asset: ReturnType<typeof normalizeTerrainAssetMetadata>,
  width: number,
  height: number,
  useTileAtlas: boolean
): StudioTerrainCell[][] {
  const fallbackTexture = asset?.terrainTextures[0] ?? null;
  const terrain = resolvePrimaryTerrainArray(map, width, height);

  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const rawTile = terrain[y]?.[x];
      const texture = findTerrainTexture(asset, rawTile ?? fallbackTexture?.index ?? 0) ?? fallbackTexture;
      const tileId = normalizeTile(rawTile);
      if (useTileAtlas) {
        return {
          source: "tile-atlas",
          terrainTextureId: texture?.id ?? `tile-${tileId}`,
          textureIndex: texture?.index ?? tileId,
          collision: texture?.collision === true,
          tileId,
        };
      }
      return {
        source: "terrain-texture",
        terrainTextureId: texture?.id ?? "terrain-0",
        textureIndex: texture?.index ?? 0,
        collision: texture?.collision === true,
      };
    })
  );
}

function shouldRenderTerrainAsTileAtlas(
  map: any,
  asset: ReturnType<typeof normalizeTerrainAssetMetadata>
): boolean {
  if (!asset?.tileAtlas?.source) return false;
  if (parseObject(map?.terrainLayer)?.mode === "control-texture") return false;

  const rawTerrain = parseArray(map?.terrain);
  if (rawTerrain.length === 0) return false;

  const maxTileId = getMaxTileId(rawTerrain);
  const declaredTileCount = asset.tileAtlas.tileCount ?? 0;
  const logicalTextureCount = asset.terrainTextures.length;

  return (
    maxTileId >= logicalTextureCount ||
    declaredTileCount > Math.max(logicalTextureCount, asset.textureGrid.columns * asset.textureGrid.rows)
  );
}

function resolvePrimaryTerrainArray(map: any, width: number, height: number): number[][] {
  const params = map?.params ?? {};
  const primaryId = resolveId(params.primaryTerrainTileset) || resolveId(params.baseTerrain);
  const terrainByTileset = parseArray(map?.terrainByTileset);
  const primaryLayer = primaryId
    ? terrainByTileset.find((layer: any) => resolveId(layer?.tilesetId ?? layer?.id) === primaryId)
    : null;
  const rawTerrain = Array.isArray(primaryLayer?.tiles) ? primaryLayer.tiles : parseArray(map?.terrain);

  if (Array.isArray(rawTerrain[0])) {
    return normalizeTerrainRows(rawTerrain, width, height);
  }

  if (Array.isArray(rawTerrain) && rawTerrain.length > 0) {
    const rows: number[][] = [];
    for (let y = 0; y < height; y += 1) {
      rows.push([]);
      for (let x = 0; x < width; x += 1) {
        rows[y][x] = normalizeTile(rawTerrain[y * width + x]);
      }
    }
    return rows;
  }

  return Array.from({ length: height }, () => Array(width).fill(0));
}

function normalizeTerrainRows(value: any[], width: number, height: number): number[][] {
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => normalizeTile(value[y]?.[x]))
  );
}

function getMaxTileId(value: unknown): number {
  let max = -1;
  const visit = (entry: unknown): void => {
    if (Array.isArray(entry)) {
      entry.forEach(visit);
      return;
    }
    const numberValue = Number(entry);
    if (Number.isFinite(numberValue) && numberValue >= 0) {
      max = Math.max(max, Math.floor(numberValue));
    }
  };
  visit(value);
  return max;
}

function normalizeMorphologyFeatures(value: unknown): StudioTerrainMorphologyFeature[] {
  const layer = parseObject(value);
  const features = (layer as { features?: unknown[] } | null | undefined)?.features;
  if (!Array.isArray(features)) return [];

  return features
    .map((feature): StudioTerrainMorphologyFeature | null => {
      if (!feature || typeof feature !== "object") return null;
      const candidate = feature as Record<string, unknown>;
      const kind = candidate.kind === "wall" ? "wall" : candidate.kind === "hole" ? "hole" : null;
      if (!kind || !Array.isArray(candidate.strokes)) return null;
      const strokes = candidate.strokes
        .map(normalizeMorphologyStroke)
        .filter((stroke): stroke is StudioTerrainMorphologyFeature["strokes"][number] => stroke !== null);

      if (strokes.length === 0) return null;
      const eraserStrokes = Array.isArray(candidate.eraserStrokes)
        ? candidate.eraserStrokes
            .map(normalizeMorphologyStroke)
            .filter((stroke): stroke is StudioTerrainMorphologyFeature["strokes"][number] => stroke !== null)
        : [];
      const operations = Array.isArray(candidate.operations)
        ? candidate.operations
            .map((operation): StudioTerrainMorphologyOperation | null => {
              if (!operation || typeof operation !== "object") return null;
              const source = operation as Record<string, unknown>;
              const mode = source.mode === "paint" ? "paint" : source.mode === "erase" ? "erase" : null;
              const stroke = normalizeMorphologyStroke(source.stroke);
              return mode && stroke ? { mode, stroke } : null;
            })
            .filter((operation): operation is NonNullable<StudioTerrainMorphologyFeature["operations"]>[number] => operation !== null)
        : [];

      return {
        id: String(candidate.id ?? `${kind}-${strokes.length}`),
        kind,
        params: (candidate.params && typeof candidate.params === "object"
          ? candidate.params
          : {}) as StudioTerrainMorphologyFeature["params"],
        strokes,
        ...(eraserStrokes.length > 0 ? { eraserStrokes } : {}),
        ...(operations.length > 0 ? { operations } : {}),
      };
    })
    .filter((feature): feature is StudioTerrainMorphologyFeature => feature !== null);
}

function normalizeMorphologyStroke(value: unknown): StudioTerrainMorphologyFeature["strokes"][number] | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const points = Array.isArray(source.points)
    ? source.points
        .map((point): { x: number; y: number } | null => {
          if (!point || typeof point !== "object") return null;
          const record = point as Record<string, unknown>;
          const x = Number(record.x);
          const y = Number(record.y);
          return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
        })
        .filter((point): point is { x: number; y: number } => point !== null)
    : [];
  if (points.length === 0) return null;
  return {
    id: String(source.id ?? `stroke-${points.length}`),
    points,
    radius: Math.max(1, Number(source.radius) || STUDIO_TERRAIN_TILE_SIZE),
  };
}

function normalizeTerrainControlTexture(
  value: unknown,
  asset: ReturnType<typeof normalizeTerrainAssetMetadata>,
  mapWidth: number,
  mapHeight: number,
  tileSize: number
): StudioTerrainControlTexture | null {
  const layer = parseObject(value);
  if (!layer || layer.mode !== "control-texture") return null;
  const controlTexture = parseObject(layer.controlTexture);
  const fileName = stringValue(controlTexture?.fileName) ?? stringValue(controlTexture?.src);
  if (!fileName) return null;

  const palette = normalizeStringList(layer.palette);
  const fallbackPalette = asset?.terrainTextures.map((texture) => texture.id) ?? [];
  return {
    source: resolveAssetSource(fileName),
    width: positiveNumber(layer.width) ?? mapWidth,
    height: positiveNumber(layer.height) ?? mapHeight,
    tileSize: positiveNumber(layer.tileSize) ?? tileSize,
    palette: palette.length > 0 ? palette : fallbackPalette,
    ...(stringValue(controlTexture?.encoding) ? { encoding: stringValue(controlTexture?.encoding) } : {}),
  };
}

function normalizeWaterAnimationOptions(value: unknown): StudioWaterAnimationOptions {
  const options = parseObject(value);
  return {
    enabled: options?.enabled === true,
    speed: clampNumber(finiteNumber(options?.speed) ?? 1, 0.1, 4),
    intensity: clampNumber(finiteNumber(options?.intensity) ?? 0.45, 0, 1),
    direction: normalizeDegrees(finiteNumber(options?.direction) ?? 90),
  };
}

function parseArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  const parsed = typeof value === "string" ? parseJson(value) : value;
  return Array.isArray(parsed) ? parsed : [];
}

function normalizeList(value: unknown): any[] {
  const parsed = typeof value === "string" ? parseJson(value) : value;
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === "object") {
    const record = parsed as Record<string, unknown>;
    if (Array.isArray(record.items)) return record.items;
    if (Array.isArray(record.data)) return record.data;
    if (Array.isArray(record.values)) return record.values;
  }
  return [parsed];
}

function normalizeStringList(value: unknown): string[] {
  const parsed = typeof value === "string" ? parseJson(value) : value;
  return Array.isArray(parsed)
    ? parsed
        .map((item) => (typeof item === "string" || typeof item === "number" ? String(item) : ""))
        .filter((item) => item.length > 0)
    : [];
}

function parseObject(value: unknown): Record<string, unknown> | null {
  const parsed = typeof value === "string" ? parseJson(value) : value;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : null;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeTile(value: unknown): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? Math.floor(numberValue) : 0;
}

function positiveNumber(value: unknown): number | undefined {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function resolveId(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    const raw = String(value).trim();
    return raw.startsWith("#") ? raw.slice(1) : raw;
  }
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  return resolveId(record._id) || resolveId(record.id) || resolveId(record.mediaId);
}
