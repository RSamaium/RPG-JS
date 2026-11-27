import { describe, expect, it } from "vitest";
import { createBattle } from "../core";
import { enemyFromDb, skillFromDb, troopFromDb } from "../server/database";
import { catalog, goblin, hero, stats } from "./fixtures";

describe("the tags of the records of the database in a battle", () => {
  it("a skill, an enemy and a troop of the database keep their tags", () => {
    expect(skillFromDb("fire", { name: "Feu", tags: ["fire", "magic"] })!.tags).toEqual(["fire", "magic"]);
    expect(enemyFromDb({ name: "Dragon", tags: ["boss"], turnBattle: { battler: "dragon", stats: stats() } })!.tags).toEqual(["boss"]);
    expect(enemyFromDb({ name: "Gobelin", tags: ["goblin"], parameters: {} })!.tags).toEqual(["goblin"]);
    expect(troopFromDb("lair", { tags: ["boss"], enemies: ["dragon"] })!.tags).toEqual(["boss"]);
  });

  it("a record without tags has none", () => {
    expect(skillFromDb("slash", { name: "Tranche" })!.tags).toBeUndefined();
    expect(troopFromDb("pack", { enemies: ["goblin"] })!.tags).toBeUndefined();
  });

  it("the fighters of a battle carry the tags of their record", () => {
    const state = createBattle({
      id: "b1",
      seed: 1,
      allies: [hero()],
      enemies: [goblin("g1", { tags: ["goblin", "undead"] }), goblin("g2")],
      catalog: { ...catalog, skills: { ...catalog.skills, fire: { ...catalog.skills.fire, tags: ["fire"] } } },
    } as any);

    expect(state.combatants.find((c) => c.id === "g1")!.tags).toEqual(["goblin", "undead"]);
    expect(state.combatants.find((c) => c.id === "g2")!.tags).toEqual([]);
    expect(state.combatants.find((c) => c.id === "hero")!.tags).toEqual([]);
    expect(state.catalog.skills.fire.tags).toEqual(["fire"]);
  });
});
