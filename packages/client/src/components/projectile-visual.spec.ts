import { describe, expect, test } from "vitest";
import { projectileImpactFeedback } from "./projectile-visual";

describe("projectileImpactFeedback", () => {
  const impact = { x: 1000, y: 1000 };

  test("an impact next to the local player is felt at full strength", () => {
    expect(projectileImpactFeedback(impact, { x: 1030, y: 1000 }, { shake: 6 })).toEqual({ shake: 6, maxDistance: 480 });
  });

  test("the shake fades with the distance", () => {
    const near = projectileImpactFeedback(impact, { x: 1100, y: 1000 }, { shake: true })!;
    const far = projectileImpactFeedback(impact, { x: 1400, y: 1000 }, { shake: true })!;
    expect(near.shake).toBeLessThan(4);
    expect(far.shake).toBeLessThan(near.shake);
    expect(far.shake).toBeGreaterThan(0);
  });

  test("an impact beyond the feedback distance is not felt", () => {
    expect(projectileImpactFeedback(impact, { x: 1500, y: 1000 }, { shake: 6 })).toBeNull();
    expect(projectileImpactFeedback(impact, { x: 1150, y: 1000 }, { shake: 6, feedbackDistance: 120 })).toBeNull();
  });

  test("the feedback distance carries the sound as far", () => {
    expect(projectileImpactFeedback(impact, { x: 1700, y: 1000 }, { feedbackDistance: 900 })?.maxDistance).toBe(900);
  });

  test("without a local player, the impact is felt at full strength", () => {
    expect(projectileImpactFeedback(impact, null, { shake: true })).toEqual({ shake: 4, maxDistance: 480 });
  });

  test("a look without shake gives no shake", () => {
    expect(projectileImpactFeedback(impact, { x: 1000, y: 1000 }, {})?.shake).toBe(0);
  });
});
