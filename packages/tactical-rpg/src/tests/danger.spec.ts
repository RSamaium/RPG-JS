import { describe, it, expect } from "vitest";
import { createEncounter } from "./fixture";
import { dangerZone, threatOf, transition, validPath, key } from "../core";

describe("chosen path", () => {
  it("accepts a detour within the move, refuses gaps, loops, occupied cells and too long routes", () => {
    const state = transition(createEncounter(), { type: "start" }, "ally").state;
    const warrior = state.units.find((u) => u.id === "ally-warrior")!; // 4,5 move 3
    expect(validPath(state, warrior, [{ x: 3, y: 5 }, { x: 3, y: 4 }, { x: 4, y: 4 }])).toBe(true);
    expect(validPath(state, warrior, [{ x: 4, y: 3 }])).toBe(false); // gap
    expect(validPath(state, warrior, [{ x: 4, y: 4 }, { x: 4, y: 5 }])).toBe(false); // back on itself
    expect(validPath(state, warrior, [{ x: 3, y: 5 }, { x: 2, y: 5 }])).toBe(false); // archer there
    expect(validPath(state, warrior, [{ x: 4, y: 4 }, { x: 4, y: 3 }, { x: 4, y: 2 }, { x: 3, y: 2 }])).toBe(false); // > move
  });
  it("the move event follows the chosen route; an invalid one is refused", () => {
    const state = transition(createEncounter(), { type: "start" }, "ally").state;
    const route = [{ x: 3, y: 5 }, { x: 3, y: 4 }, { x: 4, y: 4 }];
    const out = transition(state, { type: "move", unitId: "ally-warrior", cell: { x: 4, y: 4 }, path: route }, "ally");
    expect(out.event.path).toEqual(route);
    expect(() => transition(state, { type: "move", unitId: "ally-warrior", cell: { x: 4, y: 3 }, path: route }, "ally")).toThrow("t.error.move");
  });
});

describe("danger zone", () => {
  it("covers what each enemy can reach then hit", () => {
    const state = transition(createEncounter(), { type: "start" }, "ally").state;
    const warrior = state.units.find((u) => u.id === "enemy-warrior")!; // 4,1 move 3 range 1
    const threat = threatOf(state, warrior);
    expect(threat.move.has(key({ x: 4, y: 4 }))).toBe(true);
    expect(threat.attack.has(key({ x: 4, y: 5 }))).toBe(true);
    const zone = dangerZone(state, "enemy");
    expect(zone.has(key({ x: 4, y: 5 }))).toBe(true);
    // The warrior (move 3, range 1) does not reach the far corner.
    expect(threat.attack.has(key({ x: 0, y: 6 }))).toBe(false);
  });
});
