import { describe, expect, it, test } from "vitest";
import { projectileImpactFeedback, projectileImpactFx, projectileTrailFx } from "./projectile-visual";

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

describe("particle effects of a projectile", () => {
  const preset = { emitters: [{ burst: 4 }] };

  it("reads a preset name, or a preset of its own with its tuning", () => {
    expect(projectileTrailFx("fireball")).toEqual({ name: "fireball" });
    expect(projectileTrailFx("none")).toBeNull();
    expect(projectileTrailFx({ preset, color: "#ff0000", intensity: 2, sizeScale: "big" })).toEqual({ preset, color: "#ff0000", intensity: 2 });
    // A preset without emitters is not one
    expect(projectileTrailFx({ preset: { emitters: "x" } })).toBeNull();
  });

  it("plays one impact effect for every surface, or one per surface", () => {
    expect(projectileImpactFx({ preset }, "wall")).toEqual({ preset });
    expect(projectileImpactFx({ target: "hitSpark", wall: { preset } }, "wall")).toEqual({ preset });
    expect(projectileImpactFx({ target: "hitSpark", wall: { preset } }, undefined)).toEqual({ name: "hitSpark" });
    expect(projectileImpactFx({ target: "hitSpark" }, "ground")).toBeNull();
  });
});
