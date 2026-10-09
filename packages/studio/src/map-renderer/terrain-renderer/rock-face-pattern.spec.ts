import { describe, expect, it } from 'vitest';
const TERRAIN_MORPHOLOGY_ROCK_TEXTURES = ['masonry', 'natural'] as const;
import { createRockFacePixels, renderRockFacePixels } from './rock-face-pattern';

const luminance = (data: Uint8ClampedArray, index: number) => data[index * 4] + data[index * 4 + 1] + data[index * 4 + 2];

describe('createRockFacePixels', () => {
  it.each(TERRAIN_MORPHOLOGY_ROCK_TEXTURES)('makes a deterministic, opaque and contrasted %s texture', (texture) => {
    const first = createRockFacePixels(texture, 64, 32);
    expect(createRockFacePixels(texture, 64, 32)).toEqual(first);
    expect(new Set(Array.from(first.filter((_, index) => index % 4 === 3)))).toEqual(new Set([255]));

    const values = Array.from({ length: 64 * 32 }, (_, index) => luminance(first, index));
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(60);
  });

  it('makes masonry rows of stone courses, and natural rock without regular rows', () => {
    const rowSpread = (data: Uint8ClampedArray, width: number, height: number) => {
      const rows = Array.from({ length: height }, (_, y) => {
        let sum = 0;
        for (let x = 0; x < width; x++) sum += luminance(data, y * width + x);
        return sum / width;
      });
      return Math.max(...rows) - Math.min(...rows);
    };
    const masonry = rowSpread(createRockFacePixels('masonry', 128, 64), 128, 64);
    const natural = rowSpread(createRockFacePixels('natural', 128, 64), 128, 64);
    expect(masonry).toBeGreaterThan(natural);
  });

  it.each(TERRAIN_MORPHOLOGY_ROCK_TEXTURES)('tiles seamlessly: the %s texture wraps like any other column pair', (texture) => {
    const width = 64;
    const height = 32;
    const data = createRockFacePixels(texture, width, height);
    const columnJump = (left: number, right: number) => {
      let sum = 0;
      for (let y = 0; y < height; y++) sum += Math.abs(luminance(data, y * width + left) - luminance(data, y * width + right));
      return sum;
    };
    let average = 0;
    for (let x = 0; x < width - 1; x++) average += columnJump(x, x + 1) / (width - 1);
    expect(columnJump(width - 1, 0)).toBeLessThan(average * 2.5);
  });
});

describe('renderRockFacePixels', () => {
  // `width` columns x 16 rows: rock on rows 0..2, floor below (RGBA mask).
  function render(faceHeight = 5, width = 4, height = 16) {
    const rockMask = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < 3; y++) for (let x = 0; x < width; x++) rockMask[(y * width + x) * 4 + 3] = 255;
    const texture = new Uint8ClampedArray(8 * 8 * 4).fill(100);
    return renderRockFacePixels({ rockMask, width, height, originX: 0, faceHeight, texture, textureWidth: 8, textureHeight: 8 });
  }
  const pixel = (data: Uint8ClampedArray, x: number, y: number, width = 4) =>
    Array.from(data.slice((y * width + x) * 4, (y * width + x) * 4 + 4));

  it('drops an opaque face below the rock edge, lit at the top and darker at the foot', () => {
    const data = render();
    expect(pixel(data, 1, 1)[3]).toBe(0);
    const top = pixel(data, 1, 3);
    const foot = pixel(data, 1, 7);
    expect(top[3]).toBe(255);
    expect(foot[3]).toBe(255);
    expect(top[0]).toBeGreaterThan(foot[0] + 40);
  });

  it('casts a fading contact shadow on the floor below the face, then leaves the floor clear', () => {
    const data = render();
    const shadowStart = pixel(data, 1, 8)[3];
    const shadowEnd = pixel(data, 1, 9)[3];
    expect(shadowStart).toBeGreaterThan(shadowEnd);
    expect(pixel(data, 1, 13)[3]).toBe(0);
  });

  it('keeps a floor in a narrow gallery: the face covers at most 55% of the opening', () => {
    // Rock rows 0..2 and 13..15: a 10 px gallery under a face 20 px high.
    const width = 2;
    const height = 16;
    const rockMask = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      if (y < 3 || y >= 13) for (let x = 0; x < width; x++) rockMask[(y * width + x) * 4 + 3] = 255;
    }
    const texture = new Uint8ClampedArray(8 * 8 * 4).fill(100);
    const data = renderRockFacePixels({ rockMask, width, height, originX: 0, faceHeight: 20, texture, textureWidth: 8, textureHeight: 8 });

    const faceRows = Array.from({ length: 10 }, (_, index) => pixel(data, 0, 3 + index, width)).filter((rgba) => rgba[3] === 255);
    expect(faceRows.length).toBe(6);
  });
});
