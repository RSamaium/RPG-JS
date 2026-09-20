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
