export type SpriteAlphaBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type TextureLike = {
  width?: unknown;
  height?: unknown;
  source?: {
    width?: unknown;
    height?: unknown;
    pixelWidth?: unknown;
    pixelHeight?: unknown;
    resource?: {
      width?: unknown;
      height?: unknown;
      naturalWidth?: unknown;
      naturalHeight?: unknown;
      videoWidth?: unknown;
      videoHeight?: unknown;
      source?: unknown;
    };
  };
};

const positiveDimension = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined;

/**
 * Resolve the dimensions of the original image rather than those of a cached
 * Pixi texture frame. Pixi can mutate a cached texture to the active
 * spritesheet frame while its source resource keeps the full image size.
 */
export const resolveTextureSourceDimensions = (
  value: unknown,
): { width: number; height: number } | undefined => {
  const texture = value as TextureLike | null | undefined;
  const source = texture?.source;
  const resource = source?.resource;
  const candidates: Array<[unknown, unknown]> = [
    [source?.pixelWidth, source?.pixelHeight],
    [resource?.naturalWidth, resource?.naturalHeight],
    [resource?.videoWidth, resource?.videoHeight],
    [resource?.width, resource?.height],
    [source?.width, source?.height],
    [texture?.width, texture?.height],
  ];

  for (const [candidateWidth, candidateHeight] of candidates) {
    const width = positiveDimension(candidateWidth);
    const height = positiveDimension(candidateHeight);
    if (width && height) return { width, height };
  }

  return undefined;
};

const alphaBoundsCache = new Map<
  string,
  Promise<Array<SpriteAlphaBounds | null> | null>
>();

export const loadCachedSpriteSheetAlphaBounds = (
  key: string,
  loader: () => Promise<Array<SpriteAlphaBounds | null> | null>,
): Promise<Array<SpriteAlphaBounds | null> | null> => {
  const cached = alphaBoundsCache.get(key);
  if (cached) return cached;

  const pending = loader().then(
    (bounds) => {
      if (bounds === null) alphaBoundsCache.delete(key);
      return bounds;
    },
    () => {
      alphaBoundsCache.delete(key);
      return null;
    },
  );
  alphaBoundsCache.set(key, pending);
  return pending;
};

export const scanSpriteSheetAlphaBounds = (
  pixels: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  framesWidth: number,
  framesHeight: number,
): Array<SpriteAlphaBounds | null> => {
  const frameWidth = Math.floor(imageWidth / framesWidth);
  const frameHeight = Math.floor(imageHeight / framesHeight);
  const bounds = Array.from(
    { length: framesWidth * framesHeight },
    () => ({
      left: frameWidth,
      top: frameHeight,
      right: -1,
      bottom: -1,
    }),
  );

  for (let y = 0; y < imageHeight; y++) {
    const frameY = Math.min(framesHeight - 1, Math.floor(y / frameHeight));
    const localY = y - frameY * frameHeight;

    for (let x = 0; x < imageWidth; x++) {
      if (pixels[(y * imageWidth + x) * 4 + 3] === 0) continue;
      const frameX = Math.min(framesWidth - 1, Math.floor(x / frameWidth));
      const localX = x - frameX * frameWidth;
      const frame = bounds[frameY * framesWidth + frameX];
      frame.left = Math.min(frame.left, localX);
      frame.top = Math.min(frame.top, localY);
      frame.right = Math.max(frame.right, localX + 1);
      frame.bottom = Math.max(frame.bottom, localY + 1);
    }
  }

  return bounds.map((frame) => {
    if (frame.right < frame.left || frame.bottom < frame.top) return null;
    return {
      ...frame,
      width: frame.right - frame.left,
      height: frame.bottom - frame.top,
    };
  });
};

export const mergeSpriteAlphaBounds = (
  values: Array<SpriteAlphaBounds | null | undefined>,
): SpriteAlphaBounds | undefined => {
  const present = values.filter(
    (value): value is SpriteAlphaBounds => value != null,
  );
  if (present.length === 0) return undefined;

  const left = Math.min(...present.map((value) => value.left));
  const top = Math.min(...present.map((value) => value.top));
  const right = Math.max(...present.map((value) => value.right));
  const bottom = Math.max(...present.map((value) => value.bottom));

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
};
