import { describe, expect, it } from 'vitest';
import {
  createTerrainRoadTownOverlayPixels,
  isTerrainRoadTownMode,
  ROAD_TOWN_MARKED_SHADER_KEY,
  ROAD_TOWN_SIDEWALK_SHADER_KEY,
} from './road';

function createRoadMask(
  width: number,
  height: number,
  contains: (x: number, y: number) => boolean
): Uint8ClampedArray {
  const mask = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (contains(x, y)) mask[(y * width + x) * 4 + 3] = 255;
    }
  }
  return mask;
}

function pixel(data: Uint8ClampedArray, width: number, x: number, y: number): number[] {
  return Array.from(data.slice((y * width + x) * 4, (y * width + x) * 4 + 4));
}

function isMarking(data: Uint8ClampedArray, width: number, x: number, y: number): boolean {
  return pixel(data, width, x, y).slice(0, 3).every((value, index) => value === [236, 224, 181][index]);
}

function countMarking(
  data: Uint8ClampedArray,
  width: number,
  left: number,
  top: number,
  right: number,
  bottom: number
): number {
  let count = 0;
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      if (isMarking(data, width, x, y)) count += 1;
    }
  }
  return count;
}

describe('town road terrain rendering', () => {
  it('recognizes only the two reserved road presets', () => {
    expect(isTerrainRoadTownMode({ type: 'custom', shaderKey: ROAD_TOWN_SIDEWALK_SHADER_KEY })).toBe(true);
    expect(isTerrainRoadTownMode({ type: 'custom', shaderKey: ROAD_TOWN_MARKED_SHADER_KEY })).toBe(true);
    expect(isTerrainRoadTownMode({ type: 'custom', shaderKey: 'terrain-custom' })).toBe(false);
    expect(isTerrainRoadTownMode({ type: 'fade', width: 18 })).toBe(false);
  });

  it('adds sidewalks without a center line for a horizontal road', () => {
    const width = 80;
    const height = 40;
    const mask = createRoadMask(width, height, (_x, y) => y >= 8 && y <= 31);
    const overlay = createTerrainRoadTownOverlayPixels({ width, height, mask, tileSize: 48, marked: false });

    expect(pixel(overlay, width, 20, 8)[3]).toBeGreaterThan(0);
    expect(pixel(overlay, width, 20, 13)[3]).toBeGreaterThan(0);
    expect(pixel(overlay, width, 20, 19)).toEqual([0, 0, 0, 0]);
  });

  it('orients the dashed center line from horizontal and vertical road masks', () => {
    const width = 80;
    const height = 80;
    const horizontalMask = createRoadMask(width, height, (_x, y) => y >= 28 && y <= 51);
    const verticalMask = createRoadMask(width, height, (x) => x >= 28 && x <= 51);
    const horizontal = createTerrainRoadTownOverlayPixels({
      width,
      height,
      mask: horizontalMask,
      tileSize: 48,
      marked: true,
    });
    const vertical = createTerrainRoadTownOverlayPixels({
      width,
      height,
      mask: verticalMask,
      tileSize: 48,
      marked: true,
    });

    expect(countMarking(horizontal, width, 8, 30, 72, 50)).toBeGreaterThan(80);
    expect(countMarking(vertical, width, 30, 8, 50, 72)).toBeGreaterThan(80);
    expect(countMarking(horizontal, width, 8, 36, 72, 43)).toBeGreaterThan(50);
    expect(countMarking(vertical, width, 36, 8, 43, 72)).toBeGreaterThan(50);
  });

  it('keeps center markings connected through an intersection', () => {
    const width = 128;
    const height = 128;
    const mask = createRoadMask(width, height, (x, y) =>
      (y >= 52 && y <= 75) || (x >= 52 && x <= 75)
    );
    const overlay = createTerrainRoadTownOverlayPixels({ width, height, mask, tileSize: 48, marked: true });

    expect(countMarking(overlay, width, 48, 48, 80, 80)).toBeGreaterThan(20);
    expect(countMarking(overlay, width, 8, 56, 48, 72)).toBeGreaterThan(20);
    expect(countMarking(overlay, width, 56, 8, 72, 48)).toBeGreaterThan(20);
  });

  it('keeps a capped road centered instead of branching toward its corners', () => {
    const width = 128;
    const height = 128;
    const mask = createRoadMask(width, height, (x, y) => x >= 48 && x <= 79 && y >= 8 && y <= 119);
    const overlay = createTerrainRoadTownOverlayPixels({ width, height, mask, tileSize: 48, marked: true });

    const centered = countMarking(overlay, width, 60, 8, 68, 40);
    const leftCorner = countMarking(overlay, width, 48, 8, 58, 40);
    const rightCorner = countMarking(overlay, width, 70, 8, 80, 40);
    expect(centered).toBeGreaterThan(20);
    expect(leftCorner + rightCorner).toBeLessThan(centered);
  });

  it('follows a closed curved road with sidewalks and dashed markings', () => {
    const width = 128;
    const height = 128;
    const center = 64;
    const mask = createRoadMask(width, height, (x, y) => {
      const radius = Math.hypot(x - center, y - center);
      return radius >= 30 && radius <= 54;
    });
    const overlay = createTerrainRoadTownOverlayPixels({ width, height, mask, tileSize: 48, marked: true });

    expect(pixel(overlay, width, 64, 10)[3]).toBeGreaterThan(0);
    expect(pixel(overlay, width, 64, 34)[3]).toBeGreaterThan(0);
    expect(countMarking(overlay, width, 48, 16, 80, 34)).toBeGreaterThan(5);
    expect(countMarking(overlay, width, 94, 48, 112, 80)).toBeGreaterThan(5);
    expect(countMarking(overlay, width, 48, 94, 80, 112)).toBeGreaterThan(5);
    expect(countMarking(overlay, width, 16, 48, 34, 80)).toBeGreaterThan(5);
  });

  it('keeps sidewalk width bounded for very small and very large terrain tiles', () => {
    const width = 80;
    const height = 50;
    const mask = createRoadMask(width, height, (_x, y) => y >= 5 && y <= 44);
    const small = createTerrainRoadTownOverlayPixels({ width, height, mask, tileSize: 1, marked: false });
    const large = createTerrainRoadTownOverlayPixels({ width, height, mask, tileSize: 4096, marked: false });

    expect(pixel(small, width, 20, 7)[3]).toBeGreaterThan(0);
    expect(pixel(small, width, 20, 8)).toEqual([0, 0, 0, 0]);
    expect(pixel(large, width, 20, 14)[3]).toBeGreaterThan(0);
    expect(pixel(large, width, 20, 15)).toEqual([0, 0, 0, 0]);
  });
});
