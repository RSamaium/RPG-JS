import { describe, expect, it } from "vitest";
import { resolveStudioEventDisplay } from "./event-display";

describe("how big an event is on the map", () => {
  it("draws an ordinary character at the default display scale, times its own scale", () => {
    const plain = resolveStudioEventDisplay({ media: { metadata: {} }, frame: [0, 0, 32, 48], hitbox: { width: 32, height: 32 } });
    expect(plain.hitbox).toEqual({ width: 32, height: 32 });
    expect(plain.image!.width).toBeCloseTo(32 * 0.7 * 1.35);
    expect(plain.image!.height).toBeCloseTo(48 * 0.7 * 1.35);

    const scaled = resolveStudioEventDisplay({ media: { metadata: { scale: 2 } }, frame: [0, 0, 32, 48], hitbox: { width: 32, height: 32 } });
    expect(scaled.image!.width).toBeCloseTo(32 * 0.7 * 1.35 * 2);
  });

  it("draws a generated character so that its cell is 128 x 1.35 wide, and scales its hitbox with it", () => {
    const media = { metadata: { generationMode: "idle", columns: 2, rows: 2 }, width: 1024, height: 1024 };
    const display = resolveStudioEventDisplay({ media, frame: [0, 0, 512, 512], hitbox: { width: 100, height: 200 } });
    expect(display.image!.width).toBeCloseTo(128 * 1.35);
    expect(display.hitbox).toEqual({ width: 34, height: 68 });
  });

  it("gives only the hitbox to an event without a character", () => {
    expect(resolveStudioEventDisplay({ hitbox: { width: 32, height: 32 } })).toEqual({ hitbox: { width: 32, height: 32 } });
    expect(resolveStudioEventDisplay({ media: { metadata: {} }, frame: null, hitbox: { width: 20, height: 10 } })).toEqual({ hitbox: { width: 20, height: 10 } });
  });
});
