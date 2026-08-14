import { describe, expect, test } from "vitest";
import {
  resolveHitboxAnchor,
  resolveScaledGraphicBounds,
  resolveScaledHitboxAnchor,
  scaleHitboxForGraphicDisplay,
} from "./character-hitbox";

describe("character hitbox display helpers", () => {
  test("keeps the rendered hitbox dimensions stable when graphic display scale changes", () => {
    const hitbox = { w: 32, h: 32 };
    const scaled = scaleHitboxForGraphicDisplay(hitbox, [0.5, 0.5]);

    expect(scaled).toEqual({ w: 64, h: 64 });
    expect(scaled!.w * 0.5).toBe(32);
    expect(scaled!.h * 0.5).toBe(32);
  });

  test("anchors the graphic from the display-adjusted hitbox", () => {
    const unscaledAnchor = resolveHitboxAnchor(96, 96, undefined, { w: 32, h: 32 });
    const scaledAnchor = resolveHitboxAnchor(96, 96, undefined, { w: 64, h: 64 });

    expect(unscaledAnchor).toEqual([1 / 3, 2 / 3]);
    expect(scaledAnchor).toEqual([1 / 6, 1 / 3]);
  });

  test("keeps the graphic foot aligned with the hitbox foot after sprite scale", () => {
    const anchor = resolveScaledHitboxAnchor(256, 256, undefined, { w: 56, h: 50 }, [0.5, 0.5]);

    const renderedBottom = (1 - anchor[1]) * 256 * 0.5;

    expect(renderedBottom).toBe(50);
  });

  test("positions components above the visible pixels of a scaled spritesheet frame", () => {
    const bounds = resolveScaledGraphicBounds({
      frameWidth: 256,
      frameHeight: 256,
      visibleBounds: {
        left: 69,
        top: 28,
        right: 191,
        bottom: 222,
      },
      anchor: [0.35119047619047616, 0.7023809523809523],
      scale: [0.42, 0.42],
    });

    expect(bounds.top).toBeCloseTo(-63.76, 3);
    expect(bounds.width).toBeCloseTo(51.24, 3);
    expect(bounds.height).toBeCloseTo(81.48, 3);
    expect(bounds.centerX).toBeCloseTo(16.84, 2);
  });

  test("uses the full scaled frame until transparent bounds are available", () => {
    const bounds = resolveScaledGraphicBounds({
      frameWidth: 256,
      frameHeight: 256,
      anchor: [0.35119047619047616, 0.7023809523809523],
      scale: [0.42, 0.42],
    });

    expect(bounds.top).toBeCloseTo(-75.52, 2);
    expect(bounds.width).toBeCloseTo(107.52, 2);
    expect(bounds.height).toBeCloseTo(107.52, 2);
  });

  test("normalizes non-uniform mirrored graphic scales", () => {
    const bounds = resolveScaledGraphicBounds({
      frameWidth: 100,
      frameHeight: 80,
      visibleBounds: { left: 10, top: 20, right: 70, bottom: 60 },
      anchor: [0.25, 0.5],
      scale: [-2, 0.5],
      x: 4,
      y: -3,
    });

    expect(bounds).toEqual({
      left: -86,
      top: -13,
      right: 34,
      bottom: 7,
      width: 120,
      height: 20,
      centerX: -26,
      centerY: -3,
    });
  });
});
