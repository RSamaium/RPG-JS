import { describe, expect, it } from "vitest";
import { createEncounter } from "./fixture";
import { transition } from "../core/rules";
import type { BattleState, Cell, RulesHooks } from "../core";

const started = () => transition(createEncounter(), { type: "start" }, "ally").state;
const unit = (state: BattleState, id: string) => state.units.find((u) => u.id === id)!;
/** The shortest order that moves `id` one cell to the right. */
const step = (state: BattleState, id: string): { cell: Cell } => {
  const u = unit(state, id);
  return { cell: { x: u.x + 1, y: u.y } };
};

describe("the hooks that extend the rules of a battle", () => {
  it("onMove: tells where a unit went, once the move is final", () => {
    const state = started();
    const from = { x: unit(state, "ally-warrior").x, y: unit(state, "ally-warrior").y };
    const seen: unknown[] = [];
    const hooks: RulesHooks[] = [{ onMove: ({ unit: u, from: f, path }) => void seen.push({ id: u.id, f, to: { x: u.x, y: u.y }, steps: path.length }) }];
    const { cell } = step(state, "ally-warrior");
    transition(state, { type: "move", unitId: "ally-warrior", cell }, "ally", hooks);
    expect(seen).toEqual([{ id: "ally-warrior", f: from, to: cell, steps: 1 }]);
  });

  it("onMove: may change the state (a trap that hurts)", () => {
    const state = started();
    const { cell } = step(state, "ally-warrior");
    const before = unit(state, "ally-warrior").hp;
    const trap: RulesHooks = { onMove: ({ unit: u }) => void (u.hp -= 3) };
    const next = transition(state, { type: "move", unitId: "ally-warrior", cell }, "ally", [trap]).state;
    expect(unit(next, "ally-warrior").hp).toBe(before - 3);
  });

  it("onDefeat: names the unit that fell and who struck it", () => {
    const state = started();
    const victim = unit(state, "enemy-warrior");
    const hero = unit(state, "ally-warrior");
    Object.assign(victim, { x: hero.x + 1, y: hero.y, hp: 1 });
    const seen: unknown[] = [];
    const hooks: RulesHooks[] = [{ onDefeat: ({ unit: u, by }) => void seen.push([u.id, by?.id]) }];
    transition(state, { type: "attack", unitId: hero.id, targetId: victim.id }, "ally", hooks);
    expect(seen).toEqual([["enemy-warrior", "ally-warrior"]]);
  });

  it("onPhase: runs when a side's phase begins, with its units ready (poison, reinforcements…)", () => {
    const state = started();
    const seen: unknown[] = [];
    const hooks: RulesHooks[] = [{ onPhase: ({ phase, round, state: s }) => void seen.push([phase, round, s.units.filter((u) => u.team === phase).every((u) => !u.acted)]) }];
    const next = transition(state, { type: "endPhase" }, "ally", hooks).state;
    transition(next, { type: "endPhase" }, "enemy", hooks);
    expect(seen).toEqual([["enemy", 1, true], ["ally", 2, true]]);
  });
});
