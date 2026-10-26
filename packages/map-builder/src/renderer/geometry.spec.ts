// @vitest-environment node
import { describe, expect, it } from "vitest";
import { grow, intersects, normalizeScale, resolveElementGeometry, unionBounds } from "./geometry";

describe("normalizeScale", () => {
  it("accepts a number or a pair, and falls back to 1 for anything invalid", () => {
    expect(normalizeScale(2)).toEqual({ x: 2, y: 2 });
    expect(normalizeScale([2, 3])).toEqual({ x: 2, y: 3 });
    expect(normalizeScale(undefined)).toEqual({ x: 1, y: 1 });
    expect(normalizeScale(0)).toEqual({ x: 1, y: 1 });
    expect(normalizeScale(-2)).toEqual({ x: 1, y: 1 });
    expect(normalizeScale(Number.NaN)).toEqual({ x: 1, y: 1 });
    expect(normalizeScale([0, 4])).toEqual({ x: 1, y: 4 });
  });
});

describe("resolveElementGeometry", () => {
  const base = { x: 10, y: 20, frame: [0, 0, 48, 48] } as const;

  it("is unknown until the size of the source is known", () => {
    expect(resolveElementGeometry({ x: 0, y: 0 })).toBeUndefined();
    expect(resolveElementGeometry({ x: 0, y: 0, sourceSize: [32, 32] })?.draw).toMatchObject({ width: 32, height: 32 });
  });

  it("takes the declared size as the size of the image when there is no frame", () => {
    const geometry = resolveElementGeometry({ x: 0, y: 0, size: [64, 96], hitbox: [16, 70, 32, 20] });
    expect(geometry?.draw).toMatchObject({ width: 64, height: 96 });
    expect(geometry?.hitbox).toMatchObject({ scaleX: 1, scaleY: 1 });
    // …but a measured image wins, so the hitbox follows the real pixels
    const measured = resolveElementGeometry({ x: 0, y: 0, size: [64, 96], sourceSize: [128, 192], hitbox: [16, 70, 32, 20] });
    expect(measured?.hitbox).toMatchObject({ scaleX: 0.5, scaleY: 0.5 });
  });

  it("draws at the size of the frame, or at the declared size", () => {
    expect(resolveElementGeometry(base)?.draw).toEqual({ x: 10, y: 20, width: 48, height: 48 });
    expect(resolveElementGeometry({ ...base, size: [96, 64] })?.draw).toEqual({ x: 10, y: 20, width: 96, height: 64 });
  });

  it("rounds sizes and keeps them at 1 pixel or more", () => {
    expect(resolveElementGeometry({ ...base, size: [10.4, 10.6], scale: 1.5 })?.draw).toMatchObject({ width: 15, height: 17 });
    expect(resolveElementGeometry({ ...base, size: [0.2, 0.2] })?.draw).toMatchObject({ width: 1, height: 1 });
  });

  it("sorts by the bottom of the drawing without a hitbox", () => {
    expect(resolveElementGeometry(base)?.sortKey).toBe(68);
  });

  it("sorts by the bottom of the scaled hitbox, plus z", () => {
    const geometry = resolveElementGeometry({ ...base, hitbox: [12, 30, 24, 14], scale: 2, depth: { z: 5 } });
    expect(geometry?.hitbox).toMatchObject({ x: 12, y: 30, width: 24, height: 14, scaleX: 2, scaleY: 2 });
    expect(geometry?.sortKey).toBe(20 + (30 + 14) * 2 + 5);
  });

  it("lets depth.anchorY replace the bottom of the hitbox", () => {
    const geometry = resolveElementGeometry({ ...base, hitbox: [12, 30, 24, 14], depth: { anchorY: 10, z: 1 } });
    expect(geometry?.sortKey).toBe(20 + 10 + 1);
  });

  it("clamps an oversized or negative hitbox to the source", () => {
    expect(resolveElementGeometry({ ...base, hitbox: [-5, -5, 500, 500] })?.hitbox).toMatchObject({
      x: 0,
      y: 0,
      width: 48,
      height: 48,
    });
    expect(resolveElementGeometry({ ...base, hitbox: [100, 100, 10, 10] })?.hitbox).toMatchObject({ x: 47, y: 47, width: 1, height: 1 });
  });

  it("never rounds the position: only sizes and the final sort key are whole", () => {
    const geometry = resolveElementGeometry({ ...base, x: 10.5, y: 20.25 });
    expect(geometry?.draw).toMatchObject({ x: 10.5, y: 20.25 });
    expect(Number.isInteger(geometry?.sortKey)).toBe(true);
  });
});

describe("rectangles", () => {
  it("unionBounds covers every rectangle, and is empty for none", () => {
    expect(unionBounds([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    expect(
      unionBounds([
        { x: 10, y: 10, width: 5, height: 5 },
        { x: 0, y: 20, width: 4, height: 4 },
      ]),
    ).toEqual({ x: 0, y: 10, width: 15, height: 14 });
  });

  it("intersects counts touching rectangles", () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    expect(intersects(a, { x: 5, y: 5, width: 10, height: 10 })).toBe(true);
    expect(intersects(a, { x: 10, y: 0, width: 5, height: 5 })).toBe(true);
    expect(intersects(a, { x: 11, y: 0, width: 5, height: 5 })).toBe(false);
  });

  it("grow adds a margin on every side", () => {
    expect(grow({ x: 10, y: 10, width: 10, height: 10 }, 5)).toEqual({ x: 5, y: 5, width: 20, height: 20 });
  });
});
