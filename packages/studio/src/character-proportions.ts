import { Assets, type Texture } from 'pixi.js';

const ALPHA_THRESHOLD = 16;
const LITTLE_ENDIAN = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;

/** Median visible frame height, using the same alpha threshold as Character Editor. */
export function visibleCharacterHeight(
  pixels: Pick<ImageData, 'data' | 'width' | 'height'>,
  columns: number,
  rows: number,
): number | undefined {
  return medianVisibleHeight(characterFrameBounds(pixels, columns, rows));
}

const medianVisibleHeight = (frames: Array<CharacterFrameBounds | undefined>): number | undefined => {
  const heights = frames
    .filter((frame): frame is CharacterFrameBounds => Boolean(frame))
    .map((frame) => frame.bottom - frame.top)
    .sort((a, b) => a - b);
  return heights[Math.floor(heights.length / 2)];
};

/**
 * Bounds of the frames of an image, read once per image and kept: the height and the calibration
 * of a character both come from them, and an animation uses the same sheet again and again.
 */
const analyses = new Map<string, Array<CharacterFrameBounds | undefined>>();

/** Reads the pixels of the already loaded Pixi image; `undefined` when they are not available (yet). */
function loadedCharacterAnalysis(image: string, columns: number, rows: number) {
  const key = `${image}:${columns}:${rows}`;
  const cached = analyses.get(key);
  if (cached) return cached;
  try {
    const texture = Assets.get<Texture>(image);
    if (!texture?.source?.resource) return undefined;
    const canvas = document.createElement('canvas');
    canvas.width = texture.width;
    canvas.height = texture.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return undefined;
    context.drawImage(texture.source.resource as CanvasImageSource, 0, 0);
    const frames = characterFrameBounds(context.getImageData(0, 0, canvas.width, canvas.height), columns, rows);
    analyses.set(key, frames);
    return frames;
  } catch {
    return undefined;
  }
}

/** Inspect the already loaded Pixi image; unavailable pixel access keeps saved scales. */
export function loadedCharacterHeight(image: string, columns: number, rows: number): number | undefined {
  const frames = loadedCharacterAnalysis(image, columns, rows);
  return frames ? medianVisibleHeight(frames) : undefined;
}

export interface CharacterFrameBounds {
  width: number;
  height: number;
  top: number;
  bottom: number;
  centerX: number;
  /** Horizontal center of the feet: the opaque pixels of the lowest rows, so arms and weapons do not move it. */
  footX: number;
}

/** Bounds of each cell. Empty cells deliberately have no calibration. */
export function characterFrameBounds(
  pixels: Pick<ImageData, 'data' | 'width' | 'height'>,
  columns: number,
  rows: number,
): Array<CharacterFrameBounds | undefined> {
  const width = Math.floor(pixels.width / columns);
  const height = Math.floor(pixels.height / rows);
  if (width < 1 || height < 1) return [];
  const stride = pixels.width;
  const bytes = pixels.data;
  // The alpha byte is the high byte of a little-endian pixel: one compare tells whether it is above the threshold.
  const words = LITTLE_ENDIAN && bytes.byteOffset % 4 === 0
    ? new Uint32Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 4))
    : null;
  const limit = (ALPHA_THRESHOLD + 1) * 0x1000000;
  const opaque = words
    ? (pixel: number) => words[pixel] >= limit
    : (pixel: number) => bytes[pixel * 4 + 3] > ALPHA_THRESHOLD;

  return Array.from({ length: columns * rows }, (_, index) => {
    const originX = (index % columns) * width;
    const originY = Math.floor(index / columns) * height;
    let left = width, right = -1, top = height, bottom = -1;
    for (let y = 0; y < height; y++) {
      const row = (originY + y) * stride + originX;
      let first = -1;
      for (let x = 0; x < width; x++) {
        if (opaque(row + x)) { first = x; break; }
      }
      if (first < 0) continue;
      let last = first;
      for (let x = width - 1; x > first; x--) {
        if (opaque(row + x)) { last = x; break; }
      }
      if (first < left) left = first;
      if (last > right) right = last;
      if (y < top) top = y;
      bottom = y;
    }
    if (bottom < top) return undefined;
    const band = Math.max(2, Math.round((bottom - top + 1) * 0.06));
    let sum = 0, count = 0;
    for (let y = Math.max(top, bottom - band + 1); y <= bottom; y++) {
      const row = (originY + y) * stride + originX;
      for (let x = left; x <= right; x++) {
        if (opaque(row + x)) { sum += x + 0.5; count++; }
      }
    }
    return { width, height, top, bottom: bottom + 1, centerX: (left + right + 1) / 2, footX: count ? sum / count : (left + right + 1) / 2 };
  });
}

export function loadedCharacterFrames(image: string, columns: number, rows: number) {
  return loadedCharacterAnalysis(image, columns, rows) ?? [];
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

/**
 * Calibrate one animation (one direction) against the reference one, so that going from one to the other
 * keeps the character the same size and the feet on the same spot.
 *
 * Medians are used instead of the first pose: a lifted foot or a raised arm in the first image would
 * shift the whole animation, while the movement inside the animation (steps, breathing) is kept.
 */
export function characterAnimationCalibration(reference: CharacterFrameBounds[], frames: CharacterFrameBounds[]) {
  const height = (bounds: CharacterFrameBounds) => bounds.bottom - bounds.top;
  const scale = median(reference.map(height)) / median(frames.map(height));
  return {
    scale,
    footX: median(frames.map(bounds => bounds.footX)),
    bottom: median(frames.map(bounds => bounds.bottom)),
    width: frames[0].width,
    height: frames[0].height,
  };
}

/**
 * Frame properties of a calibrated animation.
 *
 * `footAnchor` is the ground point of the character in the cell (`0` to `1` of the cell): the client puts it on the
 * bottom center of the hitbox, whatever the size of the cell and the scale. `spriteRealSize` and `x`
 * only keep the bounds of the graphic right where the footAnchor is not applied.
 */
export function characterFrameTransform(calibration: ReturnType<typeof characterAnimationCalibration>) {
  const { scale, footX, bottom, width, height } = calibration;
  return {
    scale: [scale, scale],
    spriteRealSize: { height: 2 * bottom - height },
    x: (width / 2 - footX) * scale,
    y: 0,
    footAnchor: [footX / width, bottom / height],
  };
}
