import { describe, expect, it } from "vitest";
import { heroesShift, stagePlace } from "../client/stage-place";

describe("place of a combatant on the stage", () => {
  const size = { w: 1000, h: 500 };

  it("is a ratio of the width and the height of the stage", () => {
    expect(stagePlace({ x: 0.25, y: 0.5 }, size)).toMatchObject({ x: 250, y: 250 });
  });

  it("stays on the stage", () => {
    expect(stagePlace({ x: -3, y: 9 }, size)).toMatchObject({ x: 0, y: 500 });
  });

  it("is smaller and farther at the back of the ground than at the front, as the formation does", () => {
    const back = stagePlace({ x: 0.5, y: 0.47 }, size);
    const front = stagePlace({ x: 0.5, y: 0.74 }, size);

    expect(back.depth).toBeCloseTo(0.85);
    expect(front.depth).toBeCloseTo(1.15);
    expect(back.depthScale).toBeLessThan(front.depthScale);
  });
});

describe("place of the party on the stage", () => {
  it("does not move the party when the troop gives no place", () => {
    expect(heroesShift(undefined)).toEqual({ x: 0, y: 0 });
  });

  it("moves the party by the distance between its place and the default one", () => {
    const shift = heroesShift({ x: 0.77, y: 0.52 });

    expect(shift.x).toBeCloseTo(0.1);
    expect(shift.y).toBeCloseTo(-0.1);
  });
});
