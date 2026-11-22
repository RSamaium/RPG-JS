import { describe, expect, it } from "vitest";
import { VISUAL_EFFECT_REFERENCE_DISTANCE, resolveTargetSpace } from "./target-space";

describe("resolveTargetSpace", () => {
  it("maps the keys of a path along the caster → target line to pixels", () => {
    const preset = { emitters: [{ pathSpace: "target", path: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 1 }] }] };
    const { emitters } = resolveTargetSpace(preset, { x: 100, y: 0 });
    expect(emitters[0]).toEqual({ path: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 100 }] });
  });

  it("rotates the path with a target that is not on the horizontal axis", () => {
    const { emitters } = resolveTargetSpace({ emitters: [{ pathSpace: "target", path: [{ x: 1, y: 0 }] }] }, { x: 0, y: 50 });
    expect(emitters[0]).toEqual({ path: [{ x: 0, y: 50 }] });
  });

  it("places an `at: target` emitter on the target and reaches nested emitters", () => {
    const { emitters } = resolveTargetSpace({ emitters: [{ emitters: [{ at: "target", x: 4, y: -2 }] }] }, { x: 30, y: 10 });
    expect(emitters[0]).toEqual({ emitters: [{ x: 34, y: 8 }] });
  });

  it("uses the reference distance without a target and leaves other emitters untouched", () => {
    const { emitters } = resolveTargetSpace({ emitters: [{ pathSpace: "target", path: [{ x: 1, y: 0 }] }, { x: 3 }] });
    expect(emitters).toEqual([{ path: [{ x: VISUAL_EFFECT_REFERENCE_DISTANCE, y: 0 }] }, { x: 3 }]);
  });
});
