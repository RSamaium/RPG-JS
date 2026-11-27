import { describe, expect, it, vi } from "vitest";
import { DAMAGE_CRITICAL, DAMAGE_GUARD, DAMAGE_PHYSIC, DAMAGE_SKILL } from "@rpgjs/server";
import { beginBattle, createRules, runCommand, type BattleState, type Combatant, type Hit, type SkillDef } from "../core";
import { nativeFormulas } from "../server/native-formulas";
import { battle, goblin, hero, stats } from "./fixtures";

type Formula = (...args: any[]) => number;
const registry = (formulas: Record<string, Formula>) => (name: string) => formulas[name];

const fighter = (over: Partial<Combatant["stats"]> = {}) =>
  ({ id: "x", stats: stats(over) }) as unknown as Combatant;

const physic = (formulas: Record<string, Formula>, attacker = fighter(), target = fighter()) => {
  const f = nativeFormulas(registry(formulas))!;
  return f.damage!({ attacker, target, rng: { next: () => 0.5, chance: () => false } as any });
};

describe("the damage formulas of RPGJS used by the battle", () => {
  it("is not used when the map has no damage formula", () => {
    expect(nativeFormulas(registry({}))).toBeUndefined();
  });

  it("deals the damage of `damagePhysic` for a basic attack", () => {
    expect(physic({ damagePhysic: () => 77 }).amount).toBe(77);
  });

  it("hands the parameters of both fighters to the formula, with the names of RPGJS", () => {
    const damagePhysic = vi.fn(() => 10);
    physic(
      { damagePhysic },
      fighter({ atk: 50, str: 40, mag: 31, int: 33, luk: 7, dex: 8, agi: 22, def: 12, mdef: 14 }),
      fighter({ def: 20, mdef: 9, agi: 5 }),
    );

    expect(damagePhysic).toHaveBeenCalledWith(
      { atk: 10, str: 40, int: 33, dex: 8, agi: 22, pdef: 12, sdef: 14, maxHp: 300, maxSp: 60 },
      { atk: 40, str: 40, int: 30, dex: 10, agi: 5, pdef: 20, sdef: 9, maxHp: 300, maxSp: 60 },
    );
  });

  it("flags a critical hit when `damageCritical` changes the damage", () => {
    const hit = physic({ damagePhysic: () => 50, damageCritical: (damage: number) => damage * 2 });

    expect(hit).toEqual({ amount: 100, crit: true });
  });

  it("is not critical when `damageCritical` leaves the damage alone", () => {
    expect(physic({ damagePhysic: () => 50, damageCritical: (damage: number) => damage }).crit).toBe(false);
  });

  it("deals the damage of `damageSkill` for a skill, with an empty coefficient by default", () => {
    const damageSkill = vi.fn(() => 90);
    const f = nativeFormulas(registry({ damageSkill, damagePhysic: () => 1 }))!;
    const skill: SkillDef = { id: "fire", name: "Fire", kind: "magical", scope: "enemy", power: 105, element: "fire" };

    const out = f.damage!({ attacker: fighter(), target: fighter(), skill, rng: { next: () => 0.5, chance: () => false } as any });

    expect(out.amount).toBe(90);
    expect(damageSkill).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), expect.objectContaining({ power: 105, coefficient: {}, element: "fire" }));
  });

  it("scales a basic attack by the power of the weapon, as its hits share it", () => {
    const f = nativeFormulas(registry({ damagePhysic: () => 100 }))!;
    const skill: SkillDef = { id: "attack", name: "", kind: "physical", scope: "enemy", power: 60 };

    expect(f.damage!({ attacker: fighter(), target: fighter(), skill, rng: { next: () => 0.5, chance: () => false } as any }).amount).toBe(60);
  });

  it("takes the guard multiplier from `damageGuard`", () => {
    expect(nativeFormulas(registry({ damagePhysic: () => 1, damageGuard: (damage: number) => damage / 4 }))!.guardMultiplier).toBe(0.25);
  });

  it("keeps the healing, the stagger and the limit gauge of the plugin", () => {
    const f = nativeFormulas(registry({ damagePhysic: () => 1 }))!;

    expect(f.heal).toBeUndefined();
    expect(f.stagger).toBeUndefined();
  });

  it("plays a whole battle with the default formulas of RPGJS", () => {
    const formulas = nativeFormulas(registry({
      damagePhysic: DAMAGE_PHYSIC,
      damageSkill: DAMAGE_SKILL,
      damageCritical: (damage: number) => damage, // DAMAGE_CRITICAL rolls the dice: not critical here
      damageGuard: DAMAGE_GUARD,
    }));
    const rules = createRules({ formulas });
    const { state } = beginBattle(battle({ enemies: [goblin("g1", { weaknesses: [] })] }), rules);
    const out = runCommand(state, { revision: state.revision, actor: state.actor!, command: { type: "attack", target: "g1" } }, rules);
    const hit = (out.beats.find((b) => b.t === "action") as { waves: Hit[][] }).waves[0][0];

    // (atk 40 - pdef 20 / 2) × ((20 + str 40) / 20), as RPGJS computes it.
    expect(hit.amount).toBe(Math.max(1, Math.round((40 - 20 / 2) * ((20 + 40) / 20))));
    expect((out.state as BattleState).combatants.find((c) => c.id === "g1")!.hp).toBe(120 - hit.amount);
  });
});
