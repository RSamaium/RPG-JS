import { describe, expect, test } from 'vitest';
import {
  CARPET_BORDER_SHADER_KEY,
  createTerrainCarpetBorderOverlayPixels,
  isTerrainCarpetMode,
} from './presets';
import type { RasterImage } from './types';

interface Rect { x: number; y: number; w: number; h: number }

function maskOf(width: number, height: number, ...rects: Rect[]): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (const rect of rects) {
    for (let y = rect.y; y < rect.y + rect.h; y += 1) {
      for (let x = rect.x; x < rect.x + rect.w; x += 1) pixels[(y * width + x) * 4 + 3] = 255;
    }
  }
  return pixels;
}

/** A carpet texture: a plain pile with a small pattern of another colour. */
function texture(pile: [number, number, number], pattern: [number, number, number]): RasterImage {
  const size = 32;
  const pixels = new Uint8ClampedArray(size * size * 4);
  for (let p = 0; p < size * size; p += 1) pixels.set([...(p % 9 === 0 ? pattern : pile), 255], p * 4);
  return { width: size, height: size, pixels };
}

const WIDTH = 200;
const HEIGHT = 160;
const carpet: Rect = { x: 30, y: 30, w: 140, h: 100 };
const pixelOf = (overlay: Uint8ClampedArray, width: number) => (x: number, y: number) => [...overlay.slice((y * width + x) * 4, (y * width + x) * 4 + 4)];
const luminance = ([r, g, b]: number[]) => r * 0.299 + g * 0.587 + b * 0.114;

describe('terrain carpet rendering', () => {
  test('recognizes only the dedicated procedural carpet preset', () => {
    expect(isTerrainCarpetMode({ type: 'custom', shaderKey: CARPET_BORDER_SHADER_KEY })).toBe(true);
    expect(isTerrainCarpetMode({ type: 'hard' })).toBe(false);
    expect(isTerrainCarpetMode({ type: 'custom', shaderKey: 'road-town-sidewalk' })).toBe(false);
  });

  test('draws, from the edge inwards, a dark outline, a light binding, a darker band and an inner line, then leaves the pile', () => {
    const overlay = createTerrainCarpetBorderOverlayPixels({ width: WIDTH, height: HEIGHT, mask: maskOf(WIDTH, HEIGHT, carpet), tileSize: 48, params: { motif: 'none' } });
    const pixel = pixelOf(overlay, WIDTH);
    // Across the left side, in the middle of its height.
    const row = carpet.y + 50;
    const outline = pixel(carpet.x, row);
    const binding = pixel(carpet.x + 2, row);
    const band = pixel(carpet.x + 9, row);
    const line = pixel(carpet.x + 13, row);

    expect(luminance(outline)).toBeLessThan(40);
    expect(outline[3]).toBeGreaterThan(200);
    expect(luminance(binding)).toBeGreaterThan(180);
    expect(binding[3]).toBeGreaterThan(220);
    expect(luminance(band)).toBeLessThan(40);
    expect(band[3]).toBeLessThan(100);
    expect(luminance(line)).toBeGreaterThan(180);
    // The pile of the carpet is left as its texture draws it.
    expect(pixel(carpet.x + 60, row)).toEqual([0, 0, 0, 0]);
  });

  test('follows the four sides alike', () => {
    const overlay = createTerrainCarpetBorderOverlayPixels({ width: WIDTH, height: HEIGHT, mask: maskOf(WIDTH, HEIGHT, carpet), tileSize: 48, params: { motif: 'none', shadow: false } });
    const pixel = pixelOf(overlay, WIDTH);
    for (const depth of [0, 9, 13]) {
      const left = pixel(carpet.x + depth, carpet.y + 50)[3];
      expect(pixel(carpet.x + carpet.w - 1 - depth, carpet.y + 50)[3]).toBe(left);
      expect(pixel(carpet.x + 70, carpet.y + depth)[3]).toBe(left);
      expect(pixel(carpet.x + 70, carpet.y + carpet.h - 1 - depth)[3]).toBe(left);
    }
  });

  test('takes the colour of the binding from the patterns of the carpet', () => {
    const input = { width: WIDTH, height: HEIGHT, mask: maskOf(WIDTH, HEIGHT, carpet), tileSize: 48, params: { motif: 'none' } };
    const red = pixelOf(createTerrainCarpetBorderOverlayPixels({ ...input, source: texture([120, 20, 20], [210, 170, 70]) }), WIDTH)(carpet.x + 70, carpet.y + 2);
    const blue = pixelOf(createTerrainCarpetBorderOverlayPixels({ ...input, source: texture([20, 40, 120], [190, 200, 215]) }), WIDTH)(carpet.x + 70, carpet.y + 2);

    // Gold on the red carpet, silver on the blue one.
    expect(red[0]).toBeGreaterThan(red[2] + 60);
    expect(Math.abs(blue[0] - blue[2])).toBeLessThan(50);
    expect(blue[2]).toBeGreaterThan(red[2] + 60);
    // A given colour replaces it.
    const given = pixelOf(createTerrainCarpetBorderOverlayPixels({ ...input, params: { motif: 'none', trimColor: '#00ff00' } }), WIDTH)(carpet.x + 70, carpet.y + 30);
    expect(given[3]).toBe(0);
    const line = pixelOf(createTerrainCarpetBorderOverlayPixels({ ...input, params: { motif: 'none', trimColor: '#00ff00' } }), WIDTH)(carpet.x + 70, carpet.y + 13);
    expect(line.slice(0, 3)).toEqual([0, 255, 0]);
  });

  test('repeats a motif along the edge, whole, and none in the corners', () => {
    const plain = createTerrainCarpetBorderOverlayPixels({ width: WIDTH, height: HEIGHT, mask: maskOf(WIDTH, HEIGHT, carpet), tileSize: 48, params: { motif: 'none', shadow: false } });
    const overlay = createTerrainCarpetBorderOverlayPixels({ width: WIDTH, height: HEIGHT, mask: maskOf(WIDTH, HEIGHT, carpet), tileSize: 48, params: { shadow: false } });
    const motifAt = (x: number, y: number) => overlay[(y * WIDTH + x) * 4 + 3] !== plain[(y * WIDTH + x) * 4 + 3];
    // The motifs of the top side: runs of motif pixels along the middle row of the band.
    const row = carpet.y + 9;
    const runs: Array<[number, number]> = [];
    for (let x = carpet.x; x < carpet.x + carpet.w; x += 1) {
      if (!motifAt(x, row)) continue;
      if (runs.length && runs[runs.length - 1][1] === x - 1) runs[runs.length - 1][1] = x;
      else runs.push([x, x]);
    }

    expect(runs.length).toBeGreaterThan(8);
    // Every motif has the same width: none is cut.
    expect(new Set(runs.map(([from, to]) => to - from)).size).toBe(1);
    // They are 9 px apart, and none stands in the corners, where the band of the other side passes.
    expect(new Set(runs.slice(1).map(([from], index) => from - runs[index][0]))).toEqual(new Set([9]));
    expect(runs[0][0]).toBeGreaterThanOrEqual(carpet.x + 14);
    expect(runs[runs.length - 1][1]).toBeLessThan(carpet.x + carpet.w - 14);
  });

  test('draws the same border whether the map is drawn whole or in pieces', () => {
    const whole = createTerrainCarpetBorderOverlayPixels({ width: WIDTH, height: HEIGHT, mask: maskOf(WIDTH, HEIGHT, carpet), tileSize: 48 });
    // A piece of the map, with the margin the renderer gives around what it keeps.
    const piece = { x: 61, y: 13, w: 110, h: 90 };
    const part = createTerrainCarpetBorderOverlayPixels({
      width: piece.w, height: piece.h, tileSize: 48, originX: piece.x, originY: piece.y,
      mask: maskOf(piece.w, piece.h, { x: 0, y: carpet.y - piece.y, w: carpet.x + carpet.w - piece.x, h: piece.h - (carpet.y - piece.y) }),
    });
    // Away from the cut sides of the piece (40 px), the pixels are those of the whole map.
    for (let y = 0; y < piece.h - 40; y += 1) {
      for (let x = 40; x < piece.w; x += 1) {
        const a = [...part.slice((y * piece.w + x) * 4, (y * piece.w + x) * 4 + 4)];
        const b = [...whole.slice(((y + piece.y) * WIDTH + x + piece.x) * 4, ((y + piece.y) * WIDTH + x + piece.x) * 4 + 4)];
        expect(a, `${x},${y}`).toEqual(b);
      }
    }
  });

  test('drops a soft shadow on the floor around the carpet, unless it is turned off', () => {
    const mask = maskOf(WIDTH, HEIGHT, carpet);
    const alphaAt = (overlay: Uint8ClampedArray, x: number, y: number) => overlay[(y * WIDTH + x) * 4 + 3];
    const overlay = createTerrainCarpetBorderOverlayPixels({ width: WIDTH, height: HEIGHT, mask, tileSize: 48 });
    expect(alphaAt(overlay, carpet.x - 1, carpet.y + 50)).toBeGreaterThan(alphaAt(overlay, carpet.x - 3, carpet.y + 50));
    expect(alphaAt(overlay, carpet.x - 3, carpet.y + 50)).toBeGreaterThan(0);
    expect(alphaAt(overlay, carpet.x - 6, carpet.y + 50)).toBe(0);
    const flat = createTerrainCarpetBorderOverlayPixels({ width: WIDTH, height: HEIGHT, mask, tileSize: 48, params: { shadow: false } });
    expect(alphaAt(flat, carpet.x - 1, carpet.y + 50)).toBe(0);
  });

  test('scales the border with the tile size and keeps every band at least one pixel wide', () => {
    const small = createTerrainCarpetBorderOverlayPixels({ width: 40, height: 40, mask: maskOf(40, 40, { x: 4, y: 4, w: 32, h: 32 }), tileSize: 10, params: { motif: 'none', shadow: false } });
    const alphas = Array.from({ length: 12 }, (_, depth) => small[(20 * 40 + 4 + depth) * 4 + 3]);
    // Outline, binding, guard, band (two pixels), inner line, inner guard: seven pixels, then the pile.
    expect(new Set(alphas.slice(0, 7)).size).toBeGreaterThanOrEqual(5);
    expect(alphas.slice(0, 7).every((alpha) => alpha > 0)).toBe(true);
    expect(alphas.slice(7).every((alpha) => alpha === 0)).toBe(true);
    const large = createTerrainCarpetBorderOverlayPixels({ width: WIDTH, height: HEIGHT, mask: maskOf(WIDTH, HEIGHT, carpet), tileSize: 48, params: { motif: 'none', shadow: false } });
    expect(large[((carpet.y + 50) * WIDTH + carpet.x + 9) * 4 + 3]).toBeGreaterThan(0);
  });

  test('follows a carpet that is not a rectangle', () => {
    // An L: the border also runs along the inner corner.
    const mask = maskOf(WIDTH, HEIGHT, { x: 30, y: 30, w: 60, h: 100 }, { x: 30, y: 90, w: 140, h: 40 });
    const overlay = createTerrainCarpetBorderOverlayPixels({ width: WIDTH, height: HEIGHT, mask, tileSize: 48, params: { motif: 'none', shadow: false } });
    const pixel = pixelOf(overlay, WIDTH);
    // Just under the inner horizontal edge (y = 90), right of the vertical arm.
    expect(luminance(pixel(130, 90))).toBeLessThan(40);
    expect(pixel(130, 90)[3]).toBeGreaterThan(200);
    expect(luminance(pixel(130, 92))).toBeGreaterThan(150);
    // Just right of the inner vertical edge (x = 89), above the horizontal arm.
    expect(pixel(89, 60)[3]).toBeGreaterThan(200);
    expect(luminance(pixel(87, 60))).toBeGreaterThan(150);
  });
});
