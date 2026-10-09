import { describe, expect, it } from 'vitest';
import { normalizeElementSubmersion, submergeElementPixels, type ElementLiquidRegion } from './element-submersion';
import { extractStudioGroundShadowPixels } from './studio-element-renderer';

const region = (width = 6, height = 10): ElementLiquidRegion => ({
  width, height,
  pixels: new Uint8ClampedArray(Array.from({ length: width * height }, () => [20, 80, 220, 255]).flat()),
  contact: new Uint8ClampedArray(Array.from({ length: width * height }, () => [30, 110, 245, 255]).flat()),
});
const artwork = (r: ElementLiquidRegion) => new Uint8ClampedArray(Array.from({ length: r.width * r.height }, (_, i) => [160, 140, 100, i % r.width > 1 && i % r.width < r.width - 1 ? 255 : 0]).flat());

describe('optional static-element submersion', () => {
  it('normalizes only finite numeric positive depths', () => {
    for (const depth of [0, -1, NaN, Infinity, '0.2', undefined]) expect(normalizeElementSubmersion({ depth })).toBeUndefined();
    expect(normalizeElementSubmersion({ depth: 2 })).toEqual({ depth: 1 });
    expect(normalizeElementSubmersion({ depth: 0.2 })).toEqual({ depth: 0.2 });
  });
  it.each([0, -1, NaN])('leaves a disabled element untouched (%s)', depth => {
    const r = region(), source = artwork(r);
    expect(submergeElementPixels(source, r, depth)).toEqual(source);
  });
  it.each([[6, 10], [12, 20]])('preserves the upper area and transparent silhouette at scale %s', (width, height) => {
    const r = region(width, height), source = artwork(r);
    const result = submergeElementPixels(source, r, 0.2);
    expect(result.slice(0, width * height * 0.8 * 4)).toEqual(source.slice(0, width * height * 0.8 * 4));
    for (let i = 3; i < source.length; i += 4) if (source[i] === 0) expect(result[i]).toBe(0);
    expect(result[(width * (height - 1) + 3) * 4 + 2]).toBeGreaterThan(100);
  });
  it('preserves erased/dry pixels even below the waterline', () => {
    const r = region(), source = artwork(r);
    r.pixels.fill(0);
    expect(submergeElementPixels(source, r, 1)).toEqual(source);
    r.pixels.set([10, 100, 230, 255], (9 * 6 + 3) * 4);
    const output = submergeElementPixels(source, r, 1);
    expect(output.slice((9 * 6 + 2) * 4, (9 * 6 + 3) * 4)).toEqual(source.slice((9 * 6 + 2) * 4, (9 * 6 + 3) * 4));
  });
  it('does not turn extracted shadows into a contact silhouette', () => {
    const r = region(), source = artwork(r);
    source.set([20, 20, 20, 90], (9 * 6) * 4);
    const separated = extractStudioGroundShadowPixels(source, 6, 10);
    expect(separated.shadow[(9 * 6) * 4 + 3]).toBe(90);
    expect(submergeElementPixels(separated.element, r, 0.2)[(9 * 6) * 4 + 3]).toBe(0);
  });
});
