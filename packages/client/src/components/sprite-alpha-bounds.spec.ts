import { describe, expect, test, vi } from "vitest";
import {
  loadCachedSpriteSheetAlphaBounds,
  mergeSpriteAlphaBounds,
  resolveTextureSourceDimensions,
  scanSpriteSheetAlphaBounds,
} from "./sprite-alpha-bounds";

describe("sprite alpha bounds", () => {
  test("uses intrinsic source dimensions when a cached texture is sliced to one frame", () => {
    expect(
      resolveTextureSourceDimensions({
        width: 256,
        height: 256,
        source: {
          pixelWidth: 1024,
          pixelHeight: 1024,
          resource: { width: 1024, height: 1024 },
        },
      }),
    ).toEqual({ width: 1024, height: 1024 });
  });

  test("falls back to texture dimensions for unsliced textures", () => {
    expect(resolveTextureSourceDimensions({ width: 48, height: 64 })).toEqual({
      width: 48,
      height: 64,
    });
  });

  test("shares one alpha scan across sprites using the same source and grid", async () => {
    const loader = vi.fn(async () => []);

    const first = loadCachedSpriteSheetAlphaBounds("enemy.png|4x4", loader);
    const second = loadCachedSpriteSheetAlphaBounds("enemy.png|4x4", loader);

    expect(first).toBe(second);
    await first;
    expect(loader).toHaveBeenCalledTimes(1);
  });

  test("allows a later sprite to retry a transient alpha scan failure", async () => {
    const failedLoader = vi.fn(async () => null);
    const retryLoader = vi.fn(async () => []);

    await loadCachedSpriteSheetAlphaBounds(
      "transient-enemy.png|4x4",
      failedLoader,
    );
    await loadCachedSpriteSheetAlphaBounds(
      "transient-enemy.png|4x4",
      retryLoader,
    );

    expect(failedLoader).toHaveBeenCalledTimes(1);
    expect(retryLoader).toHaveBeenCalledTimes(1);
  });

  test("finds visible pixels relative to each spritesheet frame", () => {
    const pixels = new Uint8ClampedArray(8 * 4 * 4);
    const setOpaque = (x: number, y: number) => {
      pixels[(y * 8 + x) * 4 + 3] = 255;
    };
    setOpaque(1, 1);
    setOpaque(2, 2);
    setOpaque(6, 0);
    setOpaque(7, 3);

    expect(scanSpriteSheetAlphaBounds(pixels, 8, 4, 2, 1)).toEqual([
      { left: 1, top: 1, right: 3, bottom: 3, width: 2, height: 2 },
      { left: 2, top: 0, right: 4, bottom: 4, width: 2, height: 4 },
    ]);
  });

  test("merges animated frames without including transparent padding", () => {
    expect(
      mergeSpriteAlphaBounds([
        { left: 9, top: 12, right: 20, bottom: 30, width: 11, height: 18 },
        { left: 4, top: 8, right: 24, bottom: 30, width: 20, height: 22 },
      ]),
    ).toEqual({
      left: 4,
      top: 8,
      right: 24,
      bottom: 30,
      width: 20,
      height: 22,
    });
  });
});
