import { describe, expect, it } from "vitest";
import {
  buildAttachedShapeMetadata,
  resolveAttachedShapeDirection,
  resolveAttachedShapeOffset,
  resolveAttachedShapeRadius,
} from "./attachShape";

describe("attached shape helpers", () => {
  it("resolves the radius from radius or size", () => {
    expect(resolveAttachedShapeRadius({ radius: 10 })).toBe(10);
    expect(resolveAttachedShapeRadius({ width: 40, height: 20 })).toBe(20);
    expect(resolveAttachedShapeRadius({ width: 40 })).toBeUndefined();
  });

  it("offsets the shape from the owner body", () => {
    const owner = { width: 32, height: 48 };
    expect(resolveAttachedShapeOffset(undefined, owner)).toEqual({ x: 0, y: 0 });
    expect(resolveAttachedShapeOffset("top", owner)).toEqual({ x: 0, y: -24 });
    expect(resolveAttachedShapeOffset("right", owner)).toEqual({ x: 16, y: 0 });
    expect(resolveAttachedShapeOffset("bottom", {})).toEqual({ x: 0, y: 16 });
    expect(resolveAttachedShapeOffset("center", owner)).toEqual({ x: 0, y: 0 });
  });

  it("resolves direction and metadata", () => {
    expect(resolveAttachedShapeDirection(undefined)).toBe("down");
    expect(resolveAttachedShapeDirection("left" as any)).toBe("left");
    expect(buildAttachedShapeMetadata({ radius: 1 })).toBeUndefined();
    expect(buildAttachedShapeMetadata({ radius: 1, name: "vision", properties: { a: 1 } })).toEqual({
      name: "vision",
      properties: { a: 1 },
    });
  });
});
