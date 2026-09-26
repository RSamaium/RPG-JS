import { describe, expect, it } from 'vitest';
import { createRockFacePixels } from './rock-face-pattern';

describe('createRockFacePixels', () => {
  it('is deterministic, opaque and made of darker and lighter strata', () => {
    const first = createRockFacePixels(64, 32, 8);
    expect(createRockFacePixels(64, 32, 8)).toEqual(first);
    const alphas = new Set(Array.from(first.filter((_, index) => index % 4 === 3)));
    expect([...alphas]).toEqual([255]);

    const rowShade = (y: number) => {
      let sum = 0;
      for (let x = 0; x < 64; x++) sum += first[(y * 64 + x) * 4];
      return sum / 64;
    };
    const shades = Array.from({ length: 32 }, (_, y) => rowShade(y));
    expect(Math.max(...shades) - Math.min(...shades)).toBeGreaterThan(10);
  });
});
