import { describe, expect, it } from "vitest";
import { gradeStrips } from "../client/grade";

describe("the colour grading of the background of a battle", () => {
  const strips = gradeStrips(800, 600);
  const alphaAt = (y: number) => strips.reduce((sum, strip) => (y >= strip.y && y < strip.y + strip.height ? sum + strip.alpha : sum), 0);

  it("covers the width of the stage, inside its height", () => {
    expect(strips.every((strip) => strip.height > 0 && strip.y >= 0 && strip.y + strip.height <= 600)).toBe(true);
  });

  it("darkens the ground and the top, the middle staying as painted", () => {
    expect(alphaAt(2)).toBeGreaterThan(0.08);
    expect(alphaAt(200)).toBe(0);
    expect(alphaAt(598)).toBeCloseTo(0.18, 1);
  });

  it("has no edge: the next band is never more than a few percent darker than the one before", () => {
    const steps = Array.from({ length: 599 }, (_, y) => Math.abs(alphaAt(y + 1) - alphaAt(y)));

    expect(Math.max(...steps)).toBeLessThan(0.02);
  });
});
