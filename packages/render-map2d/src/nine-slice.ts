import type { TerrainNineSliceCenter } from "./types";

export function normalizeTerrainNineSliceCenter(
  value: unknown,
  sourceWidth: number,
  sourceHeight = sourceWidth,
): TerrainNineSliceCenter | undefined {
  if (!value || typeof value !== "object") return undefined;
  const center = value as Record<string, unknown>;
  const widthLimit = positiveInteger(sourceWidth);
  const heightLimit = positiveInteger(sourceHeight);
  if (!widthLimit || !heightLimit || widthLimit < 3 || heightLimit < 3) return undefined;
  const x = integerValue(center.x);
  const y = integerValue(center.y);
  const width = positiveInteger(center.width);
  const height = positiveInteger(center.height);
  if (x === undefined || y === undefined || !width || !height) return undefined;
  const normalizedX = Math.max(1, Math.min(x, widthLimit - 2));
  const normalizedY = Math.max(1, Math.min(y, heightLimit - 2));
  return {
    x: normalizedX,
    y: normalizedY,
    width: Math.min(width, widthLimit - normalizedX - 1),
    height: Math.min(height, heightLimit - normalizedY - 1),
  };
}

function positiveInteger(value: unknown): number | undefined {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : undefined;
}

function integerValue(value: unknown): number | undefined {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) ? numberValue : undefined;
}

export interface TerrainNineSliceSource {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
}

export interface TerrainNineSliceRenderInput {
  width: number;
  height: number;
  mask: Uint8ClampedArray;
  source: TerrainNineSliceSource;
  center: TerrainNineSliceCenter;
  renderTileSize: number;
}

export function renderNineSlice(input: TerrainNineSliceRenderInput): Uint8ClampedArray {
  const { width, height, mask, source } = input;
  const pixelCount = Math.max(0, width * height);
  const output = new Uint8ClampedArray(pixelCount * 4);
  const center = normalizeTerrainNineSliceCenter(input.center, source.width, source.height);
  if (
    width <= 0 || height <= 0 || !center ||
    mask.length < pixelCount * 4 ||
    source.pixels.length < source.width * source.height * 4
  ) {
    return output;
  }

  const occupied = new Uint8Array(pixelCount);
  for (let index = 0; index < pixelCount; index += 1) {
    occupied[index] = mask[index * 4 + 3] > 0 ? 1 : 0;
  }

  const boundary = createBoundaryField(occupied, width, height);
  const scaleX = Math.max(1 / source.width, input.renderTileSize / source.width);
  const scaleY = Math.max(1 / source.height, input.renderTileSize / source.height);
  const leftWidth = center.x;
  const rightWidth = source.width - center.x - center.width;
  const topHeight = center.y;
  const bottomHeight = source.height - center.y - center.height;

  for (let index = 0; index < pixelCount; index += 1) {
    if (!occupied[index]) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    const directionX = boundary.directionX[index];
    const directionY = boundary.directionY[index];
    const distance = boundary.distance[index];
    const horizontalBorderWidth = directionX < 0 ? leftWidth : directionX > 0 ? rightWidth : 0;
    const verticalBorderHeight = directionY < 0 ? topHeight : directionY > 0 ? bottomHeight : 0;
    const usesHorizontalBorder = horizontalBorderWidth > 0 && distance < horizontalBorderWidth * scaleX;
    const usesVerticalBorder = verticalBorderHeight > 0 && distance < verticalBorderHeight * scaleY;

    let sourceX: number;
    let sourceY: number;
    if (usesHorizontalBorder) {
      const depth = Math.min(horizontalBorderWidth - 1, Math.floor(distance / scaleX));
      sourceX = directionX < 0 ? depth : source.width - 1 - depth;
    } else {
      sourceX = center.x + positiveModulo(Math.floor(x / scaleX), center.width);
    }
    if (usesVerticalBorder) {
      const depth = Math.min(verticalBorderHeight - 1, Math.floor(distance / scaleY));
      sourceY = directionY < 0 ? depth : source.height - 1 - depth;
    } else {
      sourceY = center.y + positiveModulo(Math.floor(y / scaleY), center.height);
    }

    copyPixel(source.pixels, source.width, sourceX, sourceY, output, index);
  }

  return output;
}

function createBoundaryField(
  occupied: Uint8Array,
  width: number,
  height: number,
): { distance: Int32Array; directionX: Int8Array; directionY: Int8Array } {
  const pixelCount = width * height;
  const distance = new Int32Array(pixelCount);
  distance.fill(-1);
  const directionX = new Int8Array(pixelCount);
  const directionY = new Int8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let queueStart = 0;
  let queueEnd = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (!occupied[index]) continue;
      const direction = resolveOutsideDirection(occupied, width, height, x, y);
      if (direction.x === 0 && direction.y === 0) continue;
      distance[index] = 0;
      directionX[index] = direction.x;
      directionY[index] = direction.y;
      queue[queueEnd++] = index;
    }
  }

  const offsets = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0], [1, 0],
    [-1, 1], [0, 1], [1, 1],
  ] as const;
  while (queueStart < queueEnd) {
    const index = queue[queueStart++];
    const x = index % width;
    const y = Math.floor(index / width);
    for (const [offsetX, offsetY] of offsets) {
      const nextX = x + offsetX;
      const nextY = y + offsetY;
      if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue;
      const nextIndex = nextY * width + nextX;
      if (!occupied[nextIndex] || distance[nextIndex] >= 0) continue;
      distance[nextIndex] = distance[index] + 1;
      directionX[nextIndex] = directionX[index];
      directionY[nextIndex] = directionY[index];
      queue[queueEnd++] = nextIndex;
    }
  }

  return { distance, directionX, directionY };
}

function resolveOutsideDirection(
  occupied: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
): { x: -1 | 0 | 1; y: -1 | 0 | 1 } {
  const isOutside = (candidateX: number, candidateY: number) =>
    candidateX < 0 || candidateY < 0 || candidateX >= width || candidateY >= height ||
    !occupied[candidateY * width + candidateX];
  const left = isOutside(x - 1, y);
  const right = isOutside(x + 1, y);
  const top = isOutside(x, y - 1);
  const bottom = isOutside(x, y + 1);
  let directionX: -1 | 0 | 1 = left === right ? 0 : left ? -1 : 1;
  let directionY: -1 | 0 | 1 = top === bottom ? 0 : top ? -1 : 1;

  if (directionX === 0 && directionY === 0) {
    const diagonals = [
      { x: -1 as const, y: -1 as const },
      { x: 1 as const, y: -1 as const },
      { x: -1 as const, y: 1 as const },
      { x: 1 as const, y: 1 as const },
    ];
    const diagonal = diagonals.find((candidate) => isOutside(x + candidate.x, y + candidate.y));
    if (diagonal) {
      directionX = diagonal.x;
      directionY = diagonal.y;
    }
  }
  return { x: directionX, y: directionY };
}

function copyPixel(
  source: Uint8ClampedArray,
  sourceWidth: number,
  sourceX: number,
  sourceY: number,
  output: Uint8ClampedArray,
  outputIndex: number,
): void {
  const sourceOffset = (sourceY * sourceWidth + sourceX) * 4;
  const outputOffset = outputIndex * 4;
  output[outputOffset] = source[sourceOffset];
  output[outputOffset + 1] = source[sourceOffset + 1];
  output[outputOffset + 2] = source[sourceOffset + 2];
  output[outputOffset + 3] = source[sourceOffset + 3];
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

export const createTerrainNineSlicePixels = renderNineSlice;

