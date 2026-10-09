export type StudioElementScale = number | [number, number] | { x?: number; y?: number };

export interface StudioElementSizeResolution {
  baseWidth: number;
  baseHeight: number;
  scale: { x: number; y: number };
  targetWidth: number;
  targetHeight: number;
}

export interface StudioElementSizeDrawRule {
  type?: string;
  axis?: string;
}

export interface StudioElementSizeOptions {
  drawRule?: StudioElementSizeDrawRule | null;
}

const toPositiveNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
};

export const normalizeStudioElementScale = (
  value: unknown
): { x: number; y: number } | null => {
  const numericScale = toPositiveNumber(value);
  if (numericScale !== null) {
    return { x: numericScale, y: numericScale };
  }

  if (Array.isArray(value)) {
    const x = toPositiveNumber(value[0]);
    const y = toPositiveNumber(value[1]) ?? x;
    if (x !== null && y !== null) {
      return { x, y };
    }
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const x = toPositiveNumber(record.x);
    const y = toPositiveNumber(record.y) ?? x;
    if (x !== null && y !== null) {
      return { x, y };
    }
  }

  return null;
};

const readSizeCandidate = (
  source: any,
  baseWidth: number,
  baseHeight: number,
  repeatAxis: "x" | "y" | null = null
): { width: number; height: number } | null => {
  if (!source || typeof source !== "object") return null;

  const size = source.size;
  const objectSize = size && typeof size === "object" ? size : null;
  const uniformSize = toPositiveNumber(size);
  const width =
    toPositiveNumber(source.width) ??
    toPositiveNumber(source.w) ??
    (objectSize ? toPositiveNumber(objectSize.width) ?? toPositiveNumber(objectSize.w) : null) ??
    uniformSize;
  const height =
    toPositiveNumber(source.height) ??
    toPositiveNumber(source.h) ??
    (objectSize ? toPositiveNumber(objectSize.height) ?? toPositiveNumber(objectSize.h) : null) ??
    uniformSize;

  if (width === null && height === null) return null;

  const keepBaseHeight = repeatAxis === "x" && width !== null && height === null;
  const keepBaseWidth = repeatAxis === "y" && height !== null && width === null;

  return {
    width: width ?? (keepBaseWidth ? baseWidth : height! * (baseWidth / baseHeight)),
    height: height ?? (keepBaseHeight ? baseHeight : width! * (baseHeight / baseWidth)),
  };
};

const readTilesetMetadataSize = (
  metadata: any,
  baseWidth: number,
  baseHeight: number
): { width: number; height: number } | null => {
  if (!metadata || typeof metadata !== "object") return null;

  const textureGrid = metadata.textureGrid;
  return readSizeCandidate(
    {
      width:
        metadata.tilewidth ??
        metadata.tileWidth ??
        metadata.elementWidth ??
        (textureGrid && typeof textureGrid === "object" ? textureGrid.tileSize : undefined),
      height:
        metadata.tileheight ??
        metadata.tileHeight ??
        metadata.elementHeight ??
        (textureGrid && typeof textureGrid === "object" ? textureGrid.tileSize : undefined),
      size: metadata.size,
    },
    baseWidth,
    baseHeight
  );
};

const resolveRepeatAxis = (drawRule: StudioElementSizeDrawRule | null | undefined): "x" | "y" | null => {
  if (drawRule?.type !== "repeat-axis" && drawRule?.type !== "edge-repeat") return null;
  return drawRule.axis === "x" || drawRule.axis === "y" ? drawRule.axis : null;
};

export const resolveStudioElementSize = (
  element: any,
  tilesetElement: any,
  tilesetMetadata: any,
  sourceWidth: number,
  sourceHeight: number,
  options: StudioElementSizeOptions = {}
): StudioElementSizeResolution => {
  const baseWidth = Math.max(1, Math.round(sourceWidth));
  const baseHeight = Math.max(1, Math.round(sourceHeight));
  const repeatAxis = resolveRepeatAxis(options.drawRule);
  const targetSize =
    readSizeCandidate(element, baseWidth, baseHeight, repeatAxis) ??
    readSizeCandidate(tilesetElement, baseWidth, baseHeight) ??
    readTilesetMetadataSize(tilesetMetadata, baseWidth, baseHeight);

  if (targetSize) {
    const targetWidth = Math.max(1, Math.round(targetSize.width));
    const targetHeight = Math.max(1, Math.round(targetSize.height));
    return {
      baseWidth,
      baseHeight,
      targetWidth,
      targetHeight,
      scale: {
        x: targetWidth / baseWidth,
        y: targetHeight / baseHeight,
      },
    };
  }

  const explicitScale =
    normalizeStudioElementScale(element?.scale) ??
    normalizeStudioElementScale(tilesetElement?.scale) ??
    normalizeStudioElementScale(tilesetMetadata?.scale) ??
    { x: 1, y: 1 };
  const targetWidth = Math.max(1, Math.round(baseWidth * explicitScale.x));
  const targetHeight = Math.max(1, Math.round(baseHeight * explicitScale.y));

  return {
    baseWidth,
    baseHeight,
    targetWidth,
    targetHeight,
    scale: explicitScale,
  };
};
