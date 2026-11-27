import { describe, it, expect } from "vitest";
import { createTacticalBattle, tacticalEncounter, tacticalSkill, tacticalUnit, walkingSheet } from "../core";

const skill = tacticalSkill({ name: "Coup", description: "Frappe", spCost: 4, power: 10, tactical: { range: 1, shape: "single", visual: "slash", color: 0xffffff, uses: 2 } });
const unit = tacticalUnit({ name: "Ana", tactical: { role: "warrior", battler: "hero", stats: { hp: 50, sp: 8, power: 9, range: 1, move: 3 }, skills: ["coup", "missing"] } });
const encounter = tacticalEncounter({ name: "Test", tactical: { objective: "Gagner", allies: [{ unit: "ana", x: 1, y: 2 }], enemies: [{ unit: "ana", x: 1, y: 0 }] } });

describe("database helpers", () => {
  it("tag records with their type and keep the native fields", () => {
    expect(skill._type).toBe("skill");
    expect(unit._type).toBe("tactical-unit");
    expect(encounter._type).toBe("tactical-encounter");
    expect(unit.name).toBe("Ana");
  });
  it("build a battle: ids, stats, skill catalogue, meta, board defaults", () => {
    const state = createTacticalBattle(
      { name: encounter.name, data: encounter.tactical, units: { ana: unit }, skills: { coup: skill } },
      { id: "b1", origin: { x: 100, y: 50 }, players: [{ id: "p1", name: "Alice" }] },
    );
    expect(state.units.map((u) => u.id)).toEqual(["ally-ana-0", "enemy-ana-0"]);
    expect(state.units[0]).toMatchObject({ name: "Ana", battler: "hero", hp: 50, maxHp: 50, sp: 8, owner: "p1", skillIds: ["coup"] });
    expect(state.units[1].owner).toBeUndefined();
    expect(state.skills.coup).toMatchObject({ id: "coup", name: "Coup", uses: 2, power: 10 });
    expect(state.meta).toMatchObject({ name: "Test", objective: "Gagner" });
    expect(state.board).toMatchObject({ columns: 9, rows: 7, cellSize: 64, origin: { x: 100, y: 50 } });
  });
  it("keep the native coefficient of a skill, for the damage formula of the map", () => {
    const fire = tacticalSkill({ name: "Fire", power: 30, coefficient: { int: 1 }, tactical: { range: 2, shape: "single" } });
    const state = createTacticalBattle(
      { name: encounter.name, data: encounter.tactical, units: { ana: { ...unit, tactical: { ...unit.tactical, skills: ["fire"] } } }, skills: { fire } },
      { id: "b2" },
    );
    expect(state.skills.fire.coefficient).toEqual({ int: 1 });
  });
  it("reject an unknown unit", () => {
    expect(() => createTacticalBattle({ data: encounter.tactical, units: {}, skills: {} }, { id: "b" })).toThrow('Unknown unit "ana"');
  });
  it("walkingSheet: stand / walk textures per direction row", () => {
    const sheet = walkingSheet("hero", "/hero.png", { up: 3, left: 1, down: 0, right: 2 });
    expect(sheet).toMatchObject({ id: "hero", image: "/hero.png", framesWidth: 4, framesHeight: 4 });
    expect(sheet.textures["stand-down"].animations()[0][0]).toMatchObject({ frameX: 0, frameY: 0 });
    expect(sheet.textures["walk-up"].animations()[0].filter((f) => f.frameX !== undefined).map((f) => f.frameY)).toEqual([3, 3, 3, 3]);
  });
});
