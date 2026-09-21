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
    return bottom < top ? undefined : { width, height, top, bottom: bottom + 1, centerX: (left + right + 1) / 2 };
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

/** Keep the reference pose's ground point and scale throughout the timeline. */
export function characterFrameTransform(reference: CharacterFrameBounds, frame: CharacterFrameBounds) {
  const scale = (reference.bottom - reference.top) / (frame.bottom - frame.top);
  return {
    scale: [scale, scale],
    // CanvasEngine subtracts half the difference from the cell's ground anchor.
    spriteRealSize: { height: 2 * frame.bottom - frame.height },
    x: (frame.width / 2 - frame.centerX) * scale,
    y: 0,
  };
}
