import { describe, expect, test } from "vitest";
import { defineTrajectory, getTrajectory, reflectDirection, sampleTrajectory } from "./trajectory";

const context = (params: Record<string, any>, owner?: { x: number; y: number }) => ({
  origin: { x: 0, y: 0 },
  direction: { x: 1, y: 0 },
  params,
  owner: owner ? () => owner : undefined,
});

describe("trajectories", () => {
  test("linear moves at speed and ends at range", () => {
    expect(sampleTrajectory("linear", 0.5, context({ speed: 100, range: 80 }))).toMatchObject({ x: 50, z: 0, done: false });
    expect(sampleTrajectory("linear", 1, context({ speed: 100, range: 80 }))).toMatchObject({ x: 80, done: true });
  });

  test("arc lands at range and peaks at mid flight", () => {
    const params = { range: 100, duration: 1, height: 40 };
    const middle = sampleTrajectory("arc", 0.5, context(params));
    expect(middle.x).toBeCloseTo(50);
    expect(middle.z).toBeCloseTo(40);
    expect(sampleTrajectory("arc", 1, context(params))).toMatchObject({ x: 100, z: 0, done: true });
  });

  test("return goes out then comes back to the current launcher position", () => {
    const params = { speed: 100, range: 100 };
    expect(sampleTrajectory("return", 0.5, context(params, { x: 0, y: 0 }))).toMatchObject({ x: 50, phase: "out" });
    const back = sampleTrajectory("return", 1.5, context(params, { x: 0, y: 0 }));
    expect(back).toMatchObject({ phase: "back", done: false });
    expect(back.x).toBeCloseTo(50);
    expect(sampleTrajectory("return", 2.1, context(params, { x: 0, y: 0 })).done).toBe(true);
    // The way back follows the launcher when it moves.
    const moved = sampleTrajectory("return", 1.5, context(params, { x: 100, y: 100 }));
    expect(moved.y).toBeCloseTo(50);
  });

  test("custom trajectories are registered by name", () => {
    defineTrajectory("still", (_t, { origin }) => ({ ...origin, z: 0, phase: "out", done: true }));
    expect(getTrajectory("still")).toBeDefined();
    expect(sampleTrajectory("still", 3, context({}))).toMatchObject({ x: 0, done: true });
    expect(sampleTrajectory("unknown", 0.5, context({ speed: 10, range: 100 })).x).toBe(5);
  });

  test("reflects a direction on a wall normal", () => {
    expect(reflectDirection({ x: 1, y: 0 }, { x: -1, y: 0 })).toEqual({ x: -1, y: 0 });
  });
});
