import { describe, expect, it } from 'vitest';
import { RecoilSmoothing } from './recoil-smoothing';

describe('recoil presentation', () => {
  it('smooths server recoil and its final landing, but never delays ordinary controls', () => {
    const smoothing = new RecoilSmoothing();
    expect(smoothing.duration(false, 0, 4, 100)).toBe(0);
    expect(smoothing.duration(true, 0, 4, 200)).toBe(80);
    expect(smoothing.duration(false, 4, 5, 220)).toBe(80);
    expect(smoothing.duration(false, 5, 9, 310)).toBe(0);
  });
  it('snaps teleports instead of drawing a recoil across the map', () => {
    expect(new RecoilSmoothing().duration(true, 0, 500, 200)).toBe(0);
  });
});
