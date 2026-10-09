import type {
  TerrainAssetMetadata,
  TerrainRenderMode,
  TerrainSourceRect,
  TerrainTextureGridMetadata,
  TerrainTextureMetadata,
  TerrainTileAtlasMetadata,
  TerrainTransitionRule,
} from "../types";

interface TerrainMediaLike {
  fileName?: string;
  metadata?: Record<string, unknown>;
}

export function normalizeTerrainAssetMetadata(
  terrain: TerrainMediaLike | Record<string, unknown> | null | undefined
): TerrainAssetMetadata | null {
  if (!terrain) return null;
  const metadata = ((terrain as TerrainMediaLike).metadata ?? terrain ?? {}) as Record<string, unknown>;
  const atlasSource =
    stringValue((terrain as TerrainMediaLike).fileName) ??
    stringValue(metadata.fileName) ??
    "";
  const sourceTexture =
    stringValue(metadata.sourceTexture) ??
    atlasSource ??
    stringValue(metadata.fileName) ??
    "";
  const textureGrid = normalizeTextureGridMetadata(metadata);
  const terrainTextures = normalizeTerrainTextures(metadata.terrainTextures, textureGrid);
  const transitions = normalizeTerrainTransitionRules(metadata.transitions);

  return {
    sourceTexture,
    tileAtlas: normalizeTileAtlasMetadata(metadata, atlasSource, textureGrid),
    textureGrid,
    terrainTextures,
    transitions,
  };
}

export function resolveTerrainTextureSourceRect(
  asset: TerrainAssetMetadata,
  texture: TerrainTextureMetadata,
  imageWidth?: number,
  imageHeight?: number
): TerrainSourceRect {
  const grid = resolveEffectiveTerrainTextureGrid(asset, imageWidth, imageHeight);
  const index = nonNegativeInteger(texture.index) ?? 0;
  const sourceIndex = positiveModulo(index, Math.max(1, grid.columns * grid.rows));
  const x = (sourceIndex % grid.columns) * grid.tileSize;
  const y = Math.floor(sourceIndex / grid.columns) * grid.tileSize;

  if (!imageWidth || !imageHeight) {
    return { x, y, width: grid.tileSize, height: grid.tileSize };
  }

  return {
    x: Math.max(0, Math.min(x, imageWidth - 1)),
    y: Math.max(0, Math.min(y, imageHeight - 1)),
    width: Math.max(1, Math.min(grid.tileSize, imageWidth - x)),
    height: Math.max(1, Math.min(grid.tileSize, imageHeight - y)),
  };
}

export function resolveTerrainTileAtlasSourceRect(
  asset: TerrainAssetMetadata,
  tileId: number,
  imageWidth?: number,
  imageHeight?: number
): TerrainSourceRect | null {
  const atlas = asset.tileAtlas;
  if (!atlas) return null;

  const tileWidth = Math.max(1, Math.floor(atlas.tileWidth));
  const tileHeight = Math.max(1, Math.floor(atlas.tileHeight));
  const columns = resolveTileAtlasColumns(atlas, tileWidth, imageWidth);
  if (columns <= 0) return null;

  const rows = imageHeight
    ? Math.max(1, Math.floor(imageHeight / tileHeight))
    : Math.max(1, Math.ceil(Math.max(atlas.tileCount ?? tileId + 1, tileId + 1) / columns));
  const availableTiles = Math.max(1, columns * rows);
  const sourceIndex = positiveModulo(nonNegativeInteger(tileId) ?? 0, availableTiles);
  const x = (sourceIndex % columns) * tileWidth;
  const y = Math.floor(sourceIndex / columns) * tileHeight;

  if (imageWidth && imageHeight && (x >= imageWidth || y >= imageHeight)) {
    return null;
  }

  return {
    x: imageWidth ? Math.max(0, Math.min(x, imageWidth - 1)) : x,
    y: imageHeight ? Math.max(0, Math.min(y, imageHeight - 1)) : y,
    width: imageWidth ? Math.max(1, Math.min(tileWidth, imageWidth - x)) : tileWidth,
    height: imageHeight ? Math.max(1, Math.min(tileHeight, imageHeight - y)) : tileHeight,
  };
}

export function resolveEffectiveTerrainTextureGrid(
  asset: TerrainAssetMetadata,
  imageWidth?: number,
  imageHeight?: number
): TerrainTextureGridMetadata {
  const declared = asset.textureGrid;
  const columns = Math.max(1, Math.floor(declared.columns));
  const rows = Math.max(1, Math.floor(declared.rows));
  let tileSize = Math.max(1, Math.floor(declared.tileSize));

  if (!imageWidth || !imageHeight) {
    return { columns, rows, tileSize };
  }

  const expectedWidth = columns * tileSize;
  const expectedHeight = rows * tileSize;
  const usesCompactMetadata =
    tileSize > 0 &&
    (Math.abs(expectedWidth - imageWidth) > 1 || Math.abs(expectedHeight - imageHeight) > 1) &&
    (imageWidth > tileSize * 2 || imageHeight > tileSize * 2);

  if (usesCompactMetadata) {
    tileSize = Math.floor(Math.min(imageWidth / columns, imageHeight / rows));
  } else {
    tileSize = Math.floor(Math.min(tileSize, imageWidth / columns, imageHeight / rows));
  }

  return {
    columns,
    rows,
    tileSize: Math.max(1, tileSize),
  };
}

export function findTerrainTexture(
  asset: TerrainAssetMetadata | null,
  textureIdOrIndex: unknown
): TerrainTextureMetadata | null {
  if (!asset) return null;
  const id = textureIdOrIndex === undefined || textureIdOrIndex === null ? "" : String(textureIdOrIndex);
  const index = Number(textureIdOrIndex);
  return (
    asset.terrainTextures.find((texture) => texture.id === id) ??
    (Number.isFinite(index)
      ? asset.terrainTextures.find((texture) => texture.index === Math.floor(index))
      : undefined) ??
    asset.terrainTextures[0] ??
    null
  );
}

export function getTerrainRenderMode(texture: TerrainTextureMetadata | null): TerrainRenderMode {
  if (texture?.defaultRenderMode) return texture.defaultRenderMode;
  if (texture?.specialType === "water") return { type: "water", border: true, foam: true };
  return { type: "fade", width: 18, curve: "smooth" };
}

export function isWaterTerrainTexture(
  asset: TerrainAssetMetadata | null,
  textureIdOrIndex: unknown
): boolean {
  const texture = findTerrainTexture(asset, textureIdOrIndex);
  if (getTerrainRenderMode(texture).type === "water") return true;
  const value = String(textureIdOrIndex ?? "");
  const label = texture?.label ?? "";
  const specialType = texture?.specialType ?? "";
  return /water|eau|liquid|river|lake|sea|ocean|swamp|marais|lava/i.test(`${value} ${label} ${specialType}`);
}

export function drawTerrainTexture(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  source: TerrainSourceRect,
  x: number,
  y: number,
  width: number,
  height = width
): void {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, source.x, source.y, source.width, source.height, x, y, width, height);
}

export function createTerrainPatternCanvas(
  image: CanvasImageSource,
  source: TerrainSourceRect,
  destinationCellSize: number
): HTMLCanvasElement {
  const cellSize = Math.max(1, Math.floor(destinationCellSize));
  const canvas = document.createElement("canvas");
  canvas.width = cellSize;
  canvas.height = cellSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  // Match Studio's terrain sampling: atlas cell borders can contain separator
  // pixels, which become visible grid lines when repeated in the world.
  const minimumSize = Math.min(source.width, source.height);
  const maximumInset = Math.min(12, Math.floor((minimumSize - 2) / 2));
  const inset = maximumInset < 1 ? 0 : Math.min(maximumInset, Math.max(1, Math.round(minimumSize * 0.03)));
  const sample = {
    x: source.x + inset,
    y: source.y + inset,
    width: source.width - inset * 2,
    height: source.height - inset * 2,
  };
  drawTerrainTexture(ctx, image, sample, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function normalizeTextureGridMetadata(metadata: Record<string, unknown>): TerrainTextureGridMetadata {
  const textureGrid = objectValue(metadata.textureGrid);
  const tileSize =
    positiveInteger(textureGrid?.tileSize) ??
    positiveInteger(metadata.tilewidth) ??
    positiveInteger(metadata.tileheight) ??
    48;
  const columns =
    positiveInteger(textureGrid?.columns) ??
    positiveInteger(metadata.sourceTextureColumns) ??
    positiveInteger(metadata.terrainAtlasColumns) ??
    positiveInteger(metadata.columns) ??
    2;
  const rows =
    positiveInteger(textureGrid?.rows) ??
    positiveInteger(metadata.sourceTextureRows) ??
    positiveInteger(metadata.terrainAtlasRows) ??
    positiveInteger(metadata.rows) ??
    2;

  return { columns, rows, tileSize };
}

function normalizeTileAtlasMetadata(
  metadata: Record<string, unknown>,
  source: string,
  textureGrid: TerrainTextureGridMetadata
): TerrainTileAtlasMetadata | null {
  if (!source) return null;

  const tileWidth =
    positiveInteger(metadata.tilewidth) ??
    positiveInteger(metadata.tileWidth) ??
    textureGrid.tileSize;
  const tileHeight =
    positiveInteger(metadata.tileheight) ??
    positiveInteger(metadata.tileHeight) ??
    textureGrid.tileSize;
  const columns =
    positiveInteger(metadata.imageColumns) ??
    positiveInteger(metadata.atlasColumns);
  const tileCount =
    positiveInteger(metadata.tilecount) ??
    positiveInteger(metadata.tileCount);

  return {
    source,
    tileWidth,
    tileHeight,
    ...(columns ? { columns } : {}),
    ...(tileCount ? { tileCount } : {}),
  };
}

function normalizeTerrainTextures(
  value: unknown,
  grid: TerrainTextureGridMetadata
): TerrainTextureMetadata[] {
  if (!Array.isArray(value)) {
    return Array.from({ length: Math.max(1, grid.columns * grid.rows) }, (_, index) => ({
      id: `terrain-${index}`,
      index,
      label: `Terrain ${index + 1}`,
      renderTileSize: 48,
    }));
  }

  return value
    .map((item, index): TerrainTextureMetadata | null => {
      if (!item || typeof item !== "object") return null;
      const texture = item as Record<string, unknown>;
      const label = stringValue(texture.label) ?? stringValue(texture.name) ?? `Terrain ${index + 1}`;
      const id = stringValue(texture.id) ?? `terrain-${index}`;
      const specialType = stringValue(texture.specialType) ?? inferTerrainSpecialType(label);
      return {
        id,
        index: nonNegativeInteger(texture.index) ?? index,
        label,
        ...(typeof texture.collision === "boolean" ? { collision: texture.collision } : {}),
        renderTileSize: positiveInteger(texture.renderTileSize) ?? 48,
        ...(specialType ? { specialType } : {}),
        ...(isTerrainRenderMode(texture.defaultRenderMode)
          ? { defaultRenderMode: texture.defaultRenderMode as TerrainRenderMode }
          : specialType === "water"
            ? { defaultRenderMode: { type: "water", border: true, foam: true } as TerrainRenderMode }
            : {}),
      };
    })
    .filter((texture): texture is TerrainTextureMetadata => texture !== null);
}

function normalizeTerrainTransitionRules(value: unknown): TerrainTransitionRule[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry): TerrainTransitionRule | null => {
      if (!entry || typeof entry !== "object") return null;
      const rule = entry as Record<string, unknown>;
      const from = stringValue(rule.from);
      const to = stringValue(rule.to);
      if (!from || !to || !isTerrainRenderMode(rule.mode)) return null;
      return {
        from,
        to,
        mode: rule.mode as TerrainRenderMode,
        ...(typeof rule.priority === "number" && Number.isFinite(rule.priority)
          ? { priority: rule.priority }
          : {}),
      };
    })
    .filter((rule): rule is TerrainTransitionRule => rule !== null);
}

function isTerrainRenderMode(value: unknown): value is TerrainRenderMode {
  if (!value || typeof value !== "object") return false;
  const mode = value as Record<string, unknown>;
  const type = mode.type;
  if (type === "nine-slice") {
    const center = mode.center as Record<string, unknown> | undefined;
    return Boolean(center)
      && Number(center?.x) >= 0
      && Number(center?.y) >= 0
      && Number(center?.width) > 0
      && Number(center?.height) > 0;
  }
  return type === "hard" || type === "fade" || type === "water" || type === "custom";
}

function inferTerrainSpecialType(label: string): string | undefined {
  const normalized = label.toLowerCase();
  return /water|river|lake|sea|ocean|lava|swamp|acid|oil/.test(normalized) ? "water" : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function positiveInteger(value: unknown): number | undefined {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : undefined;
}

function nonNegativeInteger(value: unknown): number | undefined {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isInteger(numberValue) && numberValue >= 0 ? numberValue : undefined;
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

function resolveTileAtlasColumns(
  atlas: TerrainTileAtlasMetadata,
  tileWidth: number,
  imageWidth?: number
): number {
  if (imageWidth && imageWidth > 0) {
    return Math.max(1, Math.floor(imageWidth / tileWidth));
  }
  return Math.max(1, Math.floor(atlas.columns ?? 1));
}

function positiveModulo(value: number, modulo: number): number {
  return ((Math.floor(value) % modulo) + modulo) % modulo;
}
