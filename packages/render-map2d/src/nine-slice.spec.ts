import { describe, expect, it } from 'vitest';
import { createTerrainNineSlicePixels } from './nine-slice';

function createSource(): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(5 * 5 * 4);
  for (let y = 0; y < 5; y += 1) {
    for (let x = 0; x < 5; x += 1) {
      const offset = (y * 5 + x) * 4;
      pixels[offset] = x + y * 10;
      pixels[offset + 3] = 255;
    }
  }
  return pixels;
}

function createMask(width: number, height: number, holes: Array<[number, number]> = []): Uint8ClampedArray {
  const mask = new Uint8ClampedArray(width * height * 4);
  const holeKeys = new Set(holes.map(([x, y]) => `${x},${y}`));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (holeKeys.has(`${x},${y}`)) continue;
      mask[(y * width + x) * 4 + 3] = 255;
    }
  }
  return mask;
}

function redAt(pixels: Uint8ClampedArray, width: number, x: number, y: number): number {
  return pixels[(y * width + x) * 4];
}

describe('terrain nine-slice rendering', () => {
  it('samples corners, repeatable edges, and the center without fading the mask', () => {
    const pixels = createTerrainNineSlicePixels({
      width: 9,
      height: 9,
      mask: createMask(9, 9),
      source: { width: 5, height: 5, pixels: createSource() },
      center: { x: 2, y: 2, width: 1, height: 1 },
      renderTileSize: 5,
    });

    expect(redAt(pixels, 9, 0, 0)).toBe(0);
    expect(redAt(pixels, 9, 4, 0)).toBe(2);
    expect(redAt(pixels, 9, 8, 0)).toBe(4);
    expect(redAt(pixels, 9, 0, 4)).toBe(20);
    expect(redAt(pixels, 9, 4, 4)).toBe(22);
    expect(redAt(pixels, 9, 8, 4)).toBe(24);
    expect(redAt(pixels, 9, 0, 8)).toBe(40);
    expect(redAt(pixels, 9, 8, 8)).toBe(44);
    expect([...pixels].filter((_, index) => index % 4 === 3).every((alpha) => alpha === 255)).toBe(true);
  });

  it('turns the boundary of a hole into an inward hard border', () => {
    const pixels = createTerrainNineSlicePixels({
      width: 9,
      height: 9,
      mask: createMask(9, 9, [[4, 4]]),
      source: { width: 5, height: 5, pixels: createSource() },
      center: { x: 2, y: 2, width: 1, height: 1 },
      renderTileSize: 5,
    });

    expect(pixels[(4 * 9 + 4) * 4 + 3]).toBe(0);
    expect(redAt(pixels, 9, 3, 4)).toBe(24);
    expect(redAt(pixels, 9, 5, 4)).toBe(20);
    expect(redAt(pixels, 9, 4, 3)).toBe(42);
    expect(redAt(pixels, 9, 4, 5)).toBe(2);
  });

  it('fills narrow and concave shapes without transparent seams', () => {
    const mask = createMask(3, 5, [[1, 1], [1, 2]]);
    const pixels = createTerrainNineSlicePixels({
      width: 3,
      height: 5,
      mask,
      source: { width: 5, height: 5, pixels: createSource() },
      center: { x: 2, y: 2, width: 1, height: 1 },
      renderTileSize: 5,
    });

    for (let index = 0; index < 15; index += 1) {
      expect(pixels[index * 4 + 3]).toBe(mask[index * 4 + 3]);
    }
  });
});

