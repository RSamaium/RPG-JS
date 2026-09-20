import { describe, expect, it } from 'vitest';
import { resolveTerrainLiquidPalette } from './liquid';
import { renderWaterPreset } from './presets';

describe('texture-derived liquid contacts', () => {
  it.each([[12, 90, 220], [225, 70, 8], [10, 180, 50], [8, 12, 6]])('preserves the hue of %s', (...rgb) => {
    const pixels = new Uint8ClampedArray([...rgb, 255]);
    const palette = resolveTerrainLiquidPalette({ width: 1, height: 1, pixels })!;
    expect(palette.base).toEqual(rgb);
    expect(palette.highlight).toEqual(rgb.map(c => Math.min(255, Math.round(c * 1.12))));
    expect(palette.shadow).toEqual(rgb.map(c => Math.round(c * 0.45)));
  });
  it('samples only opaque pixels inside the requested atlas region', () => {
    const image = { width: 3, height: 1, pixels: new Uint8ClampedArray([0, 0, 255, 255, 240, 80, 0, 255, 255, 255, 255, 0]) };
    expect(resolveTerrainLiquidPalette(image, { x: 1, y: 0, width: 2, height: 1 })?.base).toEqual([240, 80, 0]);
    expect(resolveTerrainLiquidPalette(image, { x: 2, y: 0, width: 1, height: 1 })).toBeNull();
  });
  it('uses an explicit fill fallback and otherwise omits the accent', () => {
    expect(resolveTerrainLiquidPalette(null, undefined, '#c40')?.base).toEqual([204, 68, 0]);
    expect(resolveTerrainLiquidPalette(null, undefined, 'rgb(10, 30, 5)')?.base).toEqual([10, 30, 5]);
    expect(resolveTerrainLiquidPalette(null)).toBeNull();
  });
  it('respects disabled borders and foam without adding an interior tint', () => {
    const mask = new Uint8ClampedArray(3 * 3 * 4).fill(255);
    const input = { width: 3, height: 3, tileSize: 3, mask, params: { fillColor: '#dc500a' } };
    const foam = renderWaterPreset(input)!;
    const noFoam = renderWaterPreset({ ...input, params: { ...input.params, foam: false } })!;
    const noBorder = renderWaterPreset({ ...input, params: { ...input.params, border: false } })!;
    expect(foam[0]).toBeGreaterThan(foam[2]);
    expect(noFoam[0]).toBeLessThan(foam[0]);
    expect(foam[4 * 4 + 3]).toBe(0);
    expect(noBorder.filter((_, i) => i % 4 === 3).every(v => v === 0)).toBe(true);
    expect(renderWaterPreset({ ...input, params: {} })).toEqual(new Uint8ClampedArray(mask.length));
  });
});
