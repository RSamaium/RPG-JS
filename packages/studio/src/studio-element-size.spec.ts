import { describe, expect, it } from "vitest";
import { resolveStudioElementSize } from "./studio-element-size";

describe("studio element size resolution", () => {
  it("uses placed element dimensions before tileset element scale", () => {
    const resolved = resolveStudioElementSize(
      { width: 92, height: 125 },
      { rect: [320, 0, 279, 376], scale: 0.55 },
      {},
      279,
      376
    );

    expect(resolved.baseWidth).toBe(279);
    expect(resolved.baseHeight).toBe(376);
    expect(resolved.targetWidth).toBe(92);
    expect(resolved.targetHeight).toBe(125);
    expect(resolved.scale.x).toBeCloseTo(92 / 279);
    expect(resolved.scale.y).toBeCloseTo(125 / 376);
  });

  it("keeps the source height when a horizontal repeat element only overrides width", () => {
    const resolved = resolveStudioElementSize(
      { width: 160 },
      { rect: [0, 0, 48, 32] },
      {},
      48,
      32,
      { drawRule: { type: "edge-repeat", axis: "x" } }
    );

    expect(resolved.targetWidth).toBe(160);
    expect(resolved.targetHeight).toBe(32);
    expect(resolved.scale.x).toBeCloseTo(160 / 48);
    expect(resolved.scale.y).toBe(1);
  });

  it("keeps the source width when a vertical repeat element only overrides height", () => {
    const resolved = resolveStudioElementSize(
      { height: 160 },
      { rect: [0, 0, 32, 48] },
      {},
      32,
      48,
      { drawRule: { type: "repeat-axis", axis: "y" } }
    );

    expect(resolved.targetWidth).toBe(32);
    expect(resolved.targetHeight).toBe(160);
    expect(resolved.scale.x).toBe(1);
    expect(resolved.scale.y).toBeCloseTo(160 / 48);
  });

  it("falls back to the tileset element dimensions", () => {
    const resolved = resolveStudioElementSize(
      {},
      { width: 96, height: 128, scale: 0.5 },
      {},
      192,
      256
    );

    expect(resolved.targetWidth).toBe(96);
    expect(resolved.targetHeight).toBe(128);
    expect(resolved.scale).toEqual({ x: 0.5, y: 0.5 });
  });

  it("falls back to tileset metadata dimensions", () => {
    const resolved = resolveStudioElementSize(
      {},
      {},
      { tilewidth: 48, tileheight: 64 },
      96,
      128
    );

    expect(resolved.targetWidth).toBe(48);
    expect(resolved.targetHeight).toBe(64);
    expect(resolved.scale).toEqual({ x: 0.5, y: 0.5 });
  });

  it("keeps explicit scale when no size fallback exists", () => {
    const resolved = resolveStudioElementSize(
      {},
      { scale: 0.55 },
      {},
      279,
      376
    );

    expect(resolved.targetWidth).toBe(153);
    expect(resolved.targetHeight).toBe(207);
    expect(resolved.scale).toEqual({ x: 0.55, y: 0.55 });
  });

  it("falls back to tileset metadata scale", () => {
    const resolved = resolveStudioElementSize(
      {},
      {},
      { scale: 2 },
      279,
      376
    );

    expect(resolved.targetWidth).toBe(558);
    expect(resolved.targetHeight).toBe(752);
    expect(resolved.scale).toEqual({ x: 2, y: 2 });
  });

  it("does not use atlas image dimensions as element dimensions", () => {
    const resolved = resolveStudioElementSize(
      {},
      {},
      { width: 1023, height: 640, scale: 1 },
      139,
      163
    );

    expect(resolved.targetWidth).toBe(139);
    expect(resolved.targetHeight).toBe(163);
    expect(resolved.scale).toEqual({ x: 1, y: 1 });
  });
});
