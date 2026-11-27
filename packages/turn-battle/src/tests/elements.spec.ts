import { describe, expect, it } from "vitest";
import { beginBattle, createRules, runCommand, type BattleState, type CombatantDef, type Hit } from "../core";
import { battle, goblin } from "./fixtures";

const rules = createRules();

/** The hit of the fire skill on the first goblin, the seed being the same in every battle. */
function fireHit(enemy: Partial<CombatantDef>): Hit {
  const { state } = beginBattle(battle({ enemies: [goblin("g1", { weaknesses: [], ...enemy })] }), rules);
  const out = runCommand(state, { revision: state.revision, actor: state.actor!, command: { type: "skill", skill: "fire" } }, rules);
  const beat = out.beats.find((b) => b.t === "action");
  return (beat as Extract<typeof beat, { t: "action" }>).waves[0][0];
}

describe("elements efficiency, like the RPGJS player", () => {
  it("multiplies the damage by the rate of the element, a rate above 1 being a vulnerability", () => {
    const neutral = fireHit({});
    const weak = fireHit({ elementsEfficiency: [{ element: "fire", rate: 2 }] });

    expect(weak.weak).toBe(true);
    expect(weak.amount).toBe(Math.round(neutral.amount * 2));
  });

  it("is a resistance when the rate is below 1", () => {
    const neutral = fireHit({});
    const resistant = fireHit({ elementsEfficiency: [{ element: "fire", rate: 0.25 }] });

    expect(resistant.resist).toBe(true);
    expect(resistant.weak).toBeUndefined();
    expect(resistant.amount).toBe(Math.max(1, Math.round(neutral.amount * 0.25)));
  });

  it("leaves the other elements alone", () => {
    const neutral = fireHit({});
    const other = fireHit({ elementsEfficiency: [{ element: "ice", rate: 3 }] });

    expect(other.amount).toBe(neutral.amount);
    expect(other.weak).toBeUndefined();
  });

  it("treats a rate of exactly 1 as neither a weakness nor a resistance", () => {
    const hit = fireHit({ elementsEfficiency: [{ element: "fire", rate: 1 }] });

    expect(hit.weak).toBeUndefined();
    expect(hit.resist).toBeUndefined();
  });

  it("lists the vulnerabilities and resistances of a combatant for the scan", () => {
    const { state } = beginBattle(
      battle({ enemies: [goblin("g1", { weaknesses: [], elementsEfficiency: [{ element: "fire", rate: 2 }, { element: "ice", rate: 0.5 }] })] }),
      rules,
    );
    const enemy = (state as BattleState).combatants.find((c) => c.side === "enemy")!;

    expect(enemy.weaknesses).toEqual(["fire"]);
    expect(enemy.resists).toEqual(["ice"]);
  });

  it("keeps the fixed multipliers of the weaknesses and resists lists", () => {
    const neutral = fireHit({});
    const legacy = fireHit({ weaknesses: ["fire"] });

    expect(legacy.weak).toBe(true);
    expect(legacy.amount).toBe(Math.round(neutral.amount * rules.formulas.weakMultiplier));
  });
});
