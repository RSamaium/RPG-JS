import { describe, expect, it } from "vitest";
import { normalizeStudioElementSortMode, polygonBottomsAt, resolveStudioElementSortBands } from "./element-slope-sort";

const one = { x: 1, y: 1 };
const slope: Array<Array<[number, number]>> = [[[0, 0], [64, 40], [64, 60], [0, 20]]];
const trunk: Array<Array<[number, number]>> = [[[20, 60], [44, 60], [44, 90], [20, 90]]];

describe("studio element slope sorting", () => {
  it("reads the bottom edge of a polygon at a given x", () => {
    expect(polygonBottomsAt(slope, 0)).toEqual([20]);
    expect(polygonBottomsAt(slope, 32)).toEqual([40]);
    expect(polygonBottomsAt(slope, 64)).toEqual([60]);
    expect(polygonBottomsAt(slope, 100)).toEqual([]);
  });

  it("splits a sloped hitbox into columns that sort lower toward the low side", () => {
    const bands = resolveStudioElementSortBands(slope, one, 64, "auto")!;
    expect(bands).toHaveLength(8);
    expect(bands[0].bottoms[0]).toBeLessThan(bands[7].bottoms[0]);
  });

  it("keeps a single sort key for a flat hitbox such as a trunk, in auto", () => {
    expect(resolveStudioElementSortBands(trunk, one, 64, "auto")).toBeNull();
  });

  it("lets sortMode force or forbid the columns", () => {
    expect(resolveStudioElementSortBands(trunk, one, 64, "slope")).not.toBeNull();
    expect(resolveStudioElementSortBands(slope, one, 64, "hitbox")).toBeNull();
  });

  it("leaves columns outside the hitbox without a bottom edge", () => {
    const bands = resolveStudioElementSortBands(trunk, one, 64, "slope")!;
    expect(bands[0].bottoms).toEqual([]);
    expect(bands[3].bottoms).toEqual([90]);
  });

  it("follows the scale of the element and ignores rectangles", () => {
    expect(resolveStudioElementSortBands(slope, { x: 2, y: 2 }, 128, "auto")![15].bottoms[0]).toBeCloseTo(117.5);
    expect(resolveStudioElementSortBands(null, one, 64, "slope")).toBeNull();
  });

  it("gives a column one bottom per ridge of a concave hitbox, so a cove sorts between the two", () => {
    // Two arms (back and front) with a cove between them.
    const cove: Array<Array<[number, number]>> = [
      [[0, 10], [64, 10], [64, 30], [0, 30]],
      [[0, 60], [64, 60], [64, 90], [0, 90]],
    ];
    const bands = resolveStudioElementSortBands(cove, one, 64, "auto")!;
    expect(bands).not.toBeNull(); // auto splits a concave hitbox even though each bottom edge is flat
    expect(bands[3].bottoms).toEqual([30, 90]);
  });

  it("merges the touching convex parts of one ridge into a single stretch", () => {
    const touching: Array<Array<[number, number]>> = [
      [[0, 10], [20, 10], [20, 40], [0, 40]],
      [[0, 40], [20, 40], [20, 70], [0, 70]],
    ];
    expect(polygonBottomsAt(touching, 10)).toEqual([70]);
  });

  it("defaults unknown modes to auto", () => {
    expect(normalizeStudioElementSortMode("nope")).toBe("auto");
    expect(normalizeStudioElementSortMode("slope")).toBe("slope");
  });
});
