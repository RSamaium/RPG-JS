import { describe, it, expect } from "vitest";
import { createEncounter } from "./fixture";
import {
  transition,
  affected,
  targetable,
} from "../core/rules";
import { reachable, key } from "../core/board";
import { chooseAction } from "../core/ai";
import type {
  BattleState,
  Command,
} from "../core/types";
const start = () =>
  transition(createEncounter(), { type: "start" }, "ally").state;
describe("authoritative tactical rules", () => {
  it("uses shortest grid paths without crossing occupied or blocked cells", () => {
    const state = start(),
      unit = state.units[0];
    state.board.blocked = ["4,4", "3,5"];
    const paths = reachable(state, unit);
    expect(paths.has("4,4")).toBe(false);
    expect(paths.has("2,5")).toBe(false);
    for (const path of paths.values())
      expect(path.length).toBeLessThanOrEqual(unit.move);
  });
  it("rejects invalid movement and leaves the source state untouched", () => {
    const state = start(),
      copy = structuredClone(state);
    expect(() =>
      transition(
        state,
        { type: "move", unitId: "ally-warrior", cell: { x: 40, y: 40 } },
        "ally",
      ),
    ).toThrow();
    expect(state).toEqual(copy);
    expect(() => transition(state, {
      type: "move", unitId: "ally-warrior", cell: { x: "4", y: "4" },
    } as unknown as Command, "ally")).toThrow();
    const moved = transition(
      state,
      { type: "move", unitId: "ally-warrior", cell: { x: 4, y: 4 } },
      "ally",
    ).state;
    expect(() =>
      transition(
        moved,
        { type: "move", unitId: "ally-warrior", cell: { x: 4, y: 3 } },
        "ally",
      ),
    ).toThrow();
  });
  it("rejects opposing unit control, repeated actions, friendly fire and out-of-range attacks", () => {
    const state = start();
    for (const command of [
      { type: "wait", unitId: "enemy-warrior" },
      { type: "attack", unitId: "ally-warrior", targetId: "ally-mage" },
      { type: "attack", unitId: "ally-warrior", targetId: "enemy-warrior" },
    ] as Command[])
      expect(() => transition(state, command, "ally")).toThrow();
    const after = transition(
      state,
      { type: "wait", unitId: "ally-warrior" },
      "ally",
    ).state;
    expect(() =>
      transition(after, { type: "wait", unitId: "ally-warrior" }, "ally"),
    ).toThrow();
  });
  it("ends the team phase, resets the incoming team and increments the round once", () => {
    let state = start();
    state = transition(state, { type: "endPhase" }, "ally").state;
    expect(state.phase).toBe("enemy");
    expect(state.round).toBe(1);
    expect(() => transition(state, { type: "endPhase" }, "ally")).toThrow();
    state = transition(state, { type: "endPhase" }, "enemy").state;
    expect(state.round).toBe(2);
    expect(state.units[0].acted).toBe(false);
  });
  it("applies mage AoE only to enemy units and consumes the special across rounds", () => {
    let state = start();
    const mage = state.units[2];
    mage.x = 4;
    mage.y = 3;
    state.units[3].x = 4;
    state.units[3].y = 1;
    state.units[4].x = 5;
    state.units[4].y = 1;
    const targets = affected(state, mage, state.units[3], true);
    expect(targets.map((u) => u.id)).toContain("enemy-archer");
    expect(targets.every((u) => u.team === "enemy")).toBe(true);
    state = transition(
      state,
      { type: "skill", unitId: mage.id, targetId: "enemy-warrior", skillId: "ember-nova" },
      "ally",
    ).state;
    expect(state.units[2].usedSkills).toContain('ember-nova');
    expect(state.units[3].hp).toBe(90);
    state = transition(state, { type: "endPhase" }, "ally").state;
    state = transition(state, { type: "endPhase" }, "enemy").state;
    expect(() =>
      transition(
        state,
        { type: "skill", unitId: mage.id, targetId: "enemy-warrior", skillId: "ember-nova" },
        "ally",
      ),
    ).toThrow();
  });
  it("ends combat when the last enemy is defeated and rejects subsequent actions", () => {
    const state = start();
    state.units.filter((u) => u.team === "enemy").forEach((u) => (u.hp = 0));
    state.units[3].hp = 1;
    state.units[3].x = 4;
    state.units[3].y = 4;
    const result = transition(
      state,
      { type: "attack", unitId: "ally-warrior", targetId: "enemy-warrior" },
      "ally",
    );
    expect(result.state.winner).toBe("ally");
    expect(result.event.hits?.[0].killed).toBe(true);
    expect(() =>
      transition(result.state, { type: "endPhase" }, "ally"),
    ).toThrow();
  });
  it("AI chooses legal movement or an attack, and a complete simulated game terminates", () => {
    let state = start();
    let turns = 0;
    while (!state.winner && turns++ < 400) {
      const command = chooseAction(state);
      expect(command).not.toBeNull();
      state = transition(state, command!, state.phase).state;
    }
    expect(state.winner).not.toBeNull();
    expect(turns).toBeLessThan(400);
  });
});
