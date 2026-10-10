import { Assets, type Texture } from 'pixi.js';

/** Median visible frame height, using the same alpha threshold as Character Editor. */
export function visibleCharacterHeight(
  pixels: Pick<ImageData, 'data' | 'width' | 'height'>,
  columns: number,
  rows: number,
): number | undefined {
  const frameWidth = Math.floor(pixels.width / columns);
  const frameHeight = Math.floor(pixels.height / rows);
  if (frameWidth < 1 || frameHeight < 1) return undefined;
  const heights: number[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      let first = frameHeight;
      let last = -1;
      for (let y = 0; y < frameHeight; y++) {
        for (let x = 0; x < frameWidth; x++) {
          const index = ((row * frameHeight + y) * pixels.width + column * frameWidth + x) * 4 + 3;
          if (pixels.data[index] > 16) {
            first = Math.min(first, y);
            last = y;
            break;
          }
        }
      }
      if (last >= first) heights.push(last - first + 1);
    }
  }
  heights.sort((a, b) => a - b);
  return heights[Math.floor(heights.length / 2)];
}

/** Inspect the already loaded Pixi image; unavailable pixel access keeps saved scales. */
export function loadedCharacterHeight(image: string, columns: number, rows: number): number | undefined {
  try {
    const texture = Assets.get<Texture>(image);
    if (!texture?.source?.resource) return undefined;
    const canvas = document.createElement('canvas');
    canvas.width = texture.width;
    canvas.height = texture.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return undefined;
    context.drawImage(texture.source.resource as CanvasImageSource, 0, 0);
    return visibleCharacterHeight(context.getImageData(0, 0, canvas.width, canvas.height), columns, rows);
  } catch {
    return undefined;
  }
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
  return Array.from({ length: columns * rows }, (_, index) => {
    let left = width, right = -1, top = height, bottom = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = (((Math.floor(index / columns) * height + y) * pixels.width)
          + (index % columns) * width + x) * 4 + 3;
        if (pixels.data[offset] <= 16) continue;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
    if (bottom < top) return undefined;
    const band = Math.max(2, Math.round((bottom - top + 1) * 0.06));
    let sum = 0, count = 0;
    for (let y = Math.max(top, bottom - band + 1); y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        const offset = (((Math.floor(index / columns) * height + y) * pixels.width)
          + (index % columns) * width + x) * 4 + 3;
        if (pixels.data[offset] > 16) { sum += x + 0.5; count++; }
      }
    }
    return { width, height, top, bottom: bottom + 1, centerX: (left + right + 1) / 2, footX: count ? sum / count : (left + right + 1) / 2 };
  });
}

export function loadedCharacterFrames(image: string, columns: number, rows: number) {
  try {
    const texture = Assets.get<Texture>(image);
    if (!texture?.source?.resource) return [];
    const canvas = document.createElement('canvas');
    canvas.width = texture.width;
    canvas.height = texture.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return [];
    context.drawImage(texture.source.resource as CanvasImageSource, 0, 0);
    return characterFrameBounds(context.getImageData(0, 0, canvas.width, canvas.height), columns, rows);
  } catch {
    return [];
  }
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
