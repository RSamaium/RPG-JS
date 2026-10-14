import { describe, expect, it } from "vitest";
import { resolveStudioMapScale, scaleStudioHitboxes } from "./map-scale";

describe("studio map scale", () => {
  it("defaults to 1 for a missing or invalid scale", () => {
    expect(resolveStudioMapScale(undefined)).toBe(1);
    expect(resolveStudioMapScale({ scale: 0 })).toBe(1);
    expect(resolveStudioMapScale({ scale: "x" })).toBe(1);
    expect(resolveStudioMapScale({ scale: 2 })).toBe(2);
  });

  it("scales rectangles and polygon points", () => {
    const hitboxes = [
      { id: "a", x: 10, y: 20, width: 30, height: 40 },
      { id: "b", points: [[1, 2], [3, 4], [5, 6]] },
    ];
    expect(scaleStudioHitboxes(hitboxes, 2)).toEqual([
      { id: "a", x: 20, y: 40, width: 60, height: 80 },
      { id: "b", points: [[2, 4], [6, 8], [10, 12]] },
    ]);
    expect(hitboxes[0].x).toBe(10);
  });

  it("returns the same hitboxes when the scale is 1", () => {
    const hitboxes = [{ id: "a", x: 1, y: 1, width: 1, height: 1 }];
    expect(scaleStudioHitboxes(hitboxes, 1)).toBe(hitboxes);
  });
});
