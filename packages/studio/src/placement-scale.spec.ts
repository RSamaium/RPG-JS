import { describe, expect, it } from "vitest";
import { readPlacementScale, resolveEventGraphicScale, scaleHitboxToPlacement } from "./placement-scale";
import { resolveStudioEventDisplay } from "./event-display";

describe("the scale a map gives to a placement of an event", () => {
  it("is 1 unless the placement says a positive number", () => {
    expect(readPlacementScale({})).toBe(1);
    expect(readPlacementScale({ scale: 2 })).toBe(2);
    expect(readPlacementScale({ scale: "1.5" })).toBe(1.5);
    for (const scale of [0, -1, Number.NaN, "x", null]) expect(readPlacementScale({ scale })).toBe(1);
  });

  it("multiplies the character, which keeps the scale of its own media", () => {
    const object = { scale: 2, params: { scale: 0.5 } };
    expect(resolveEventGraphicScale(object, object)).toBe(1);
    const bare = { scale: 2 };
    expect(resolveEventGraphicScale(bare, bare)).toBe(2); // no scale of its own: the placement's alone
    expect(resolveEventGraphicScale({ scale: 2 }, {}, { metadata: { scale: [1, 3] } })).toEqual([2, 6]);
    expect(resolveEventGraphicScale({}, { params: { scale: 0.5 } })).toBe(0.5);
    expect(resolveEventGraphicScale({}, {})).toBeUndefined();
  });

  it("does not read the position of an event as a scale", () => {
    const object = { x: 1229, y: 652, params: { scale: 0.5 } };
    expect(resolveEventGraphicScale(object, object)).toBe(0.5);
    const bare = { x: 10, y: 20 };
    expect(resolveEventGraphicScale(bare, bare)).toBeUndefined();
    const placed = { x: 10, y: 20, scale: 2 };
    expect(resolveEventGraphicScale(placed, placed)).toBe(2);
  });

  it("multiplies the hitbox, which is never smaller than a pixel", () => {
    expect(scaleHitboxToPlacement({ width: 32, height: 16 }, { scale: 2 })).toEqual({ width: 64, height: 32 });
    expect(scaleHitboxToPlacement({ width: 32, height: 16 }, {})).toEqual({ width: 32, height: 16 });
    expect(scaleHitboxToPlacement({ width: 1, height: 1 }, { scale: 0.1 })).toEqual({ width: 1, height: 1 });
  });

  it("makes the event bigger on the map, character and hitbox", () => {
    const input = { hitbox: { width: 32, height: 32 }, frame: [0, 0, 100, 200] as const, media: { metadata: {} } };
    const normal = resolveStudioEventDisplay(input);
    const big = resolveStudioEventDisplay({ ...input, scale: 2 });
    expect(big.hitbox).toEqual({ width: 64, height: 64 });
    expect(big.image).toEqual({ width: normal.image!.width * 2, height: normal.image!.height * 2 });
  });
});
