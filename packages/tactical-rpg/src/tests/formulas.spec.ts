import { describe, expect, it } from "vitest";
import { nativeDamageHook, paramsOf } from "../core/formulas";

const params = (atk: number, pdef: number) => ({ atk, str: atk, int: 0, dex: 0, agi: 0, pdef, sdef: pdef, maxHp: 100, maxSp: 10 });
const ctx = (extra: Record<string, unknown> = {}) => ({ state: {} as any, attacker: { params: params(30, 5) } as any, target: { params: params(10, 8) } as any, amount: 99, ...extra });
const formulas: Record<string, (...args: any[]) => number> = {
  damagePhysic: (a, b) => a.atk - b.pdef,
  damageSkill: (a, b, skill) => skill.power + a.int - b.sdef,
};

describe("the damage of the formulas of RPGJS in a tactical battle", () => {
  it("is the physical damage of the map for an attack, from the parameters of both units", () => {
    expect(nativeDamageHook((name) => formulas[name]).onDamage!(ctx())).toBe(22);
  });

  it("is the skill damage of the map for a skill, with the power the skill says", () => {
    expect(nativeDamageHook((name) => formulas[name]).onDamage!(ctx({ skill: { id: "fire", power: 50 } }))).toBe(42);
  });

  it("leaves the damage alone when the map has no formula or a unit has no parameters", () => {
    expect(nativeDamageHook(() => undefined).onDamage!(ctx())).toBeUndefined();
    expect(nativeDamageHook((name) => formulas[name]).onDamage!(ctx({ target: {} }))).toBeUndefined();
  });

  it("reads the parameters of a fighter with the names of RPGJS, the strength apart from the attack", () => {
    expect(paramsOf({ maxHp: 90, maxSp: 4, atk: 25, def: 6, mag: 9, mdef: 3, agi: 7, luk: 2, str: 20, int: 9, dex: 2 })).toEqual({ atk: 5, str: 20, int: 9, dex: 2, agi: 7, pdef: 6, sdef: 3, maxHp: 90, maxSp: 4 });
  });
});
