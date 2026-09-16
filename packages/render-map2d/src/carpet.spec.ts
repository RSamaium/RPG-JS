import { describe, expect, test } from 'vitest';
import {
  CARPET_BORDER_SHADER_KEY,
  createTerrainCarpetBorderOverlayPixels,
  isTerrainCarpetMode,
} from './presets';

function rectangularMask(width: number, height: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 2; y < height - 2; y += 1) {
    for (let x = 2; x < width - 2; x += 1) {
      pixels[(y * width + x) * 4 + 3] = 255;
    }
  }
  return pixels;
}

describe('terrain carpet rendering', () => {
  test('recognizes only the dedicated procedural carpet preset', () => {
    expect(isTerrainCarpetMode({ type: 'custom', shaderKey: CARPET_BORDER_SHADER_KEY })).toBe(true);
    expect(isTerrainCarpetMode({ type: 'hard' })).toBe(false);
    expect(isTerrainCarpetMode({ type: 'custom', shaderKey: 'road-town-sidewalk' })).toBe(false);
  });

  test('draws a dark outer line and a lighter inner line without softening the mask', () => {
    const width = 20;
    const height = 20;
    const overlay = createTerrainCarpetBorderOverlayPixels({
      width,
      height,
      mask: rectangularMask(width, height),
      tileSize: 10,
    });
    const pixel = (x: number, y: number) => [...overlay.slice(
      (y * width + x) * 4,
      (y * width + x) * 4 + 4,
    )];

    expect(pixel(0, 0)).toEqual([0, 0, 0, 0]);
    expect(pixel(2, 10)).toEqual([20, 20, 20, 155]);
    expect(pixel(4, 10)).toEqual([250, 250, 250, 72]);
    expect(pixel(10, 10)).toEqual([0, 0, 0, 0]);
  });

  test('scales both border bands from the RPGJS terrain tile size', () => {
    const mode = {
      type: 'custom',
      shaderKey: CARPET_BORDER_SHADER_KEY,
      params: { blendRadius: 0 },
    } as const;
    const overlay = createTerrainCarpetBorderOverlayPixels({
      width: 32,
      height: 32,
      mask: rectangularMask(32, 32),
      tileSize: 48,
    });
    const alphaAt = (x: number, y: number) => overlay[(y * 32 + x) * 4 + 3];

    expect(isTerrainCarpetMode(mode)).toBe(true);
    expect(alphaAt(2, 16)).toBe(155);
    expect(alphaAt(7, 16)).toBe(72);
    expect(alphaAt(11, 16)).toBe(0);
  });
});
