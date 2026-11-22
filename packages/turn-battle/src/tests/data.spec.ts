import { describe, expect, it } from "vitest";
import { battleEnemy, battleItem, battleSkill, battleTroop, battleWeapon, type FxPresetName } from "../core";
import { enemyFromDb, itemFromDb, skillCommandFromDb, skillFromDb, troopFromDb, weaponFromDb } from "../server";
import { stats } from "./fixtures";

describe("typed database helpers", () => {
  it("keep native fields, add _type and read back as battle data", () => {
    const fire = battleSkill({ name: "Brasier", spCost: 18, power: 105, battle: { kind: "magical", scope: "allEnemies", element: "fire", fx: "fireball" } });
    const potion = battleItem({ name: "Potion", hpValue: 150, consumable: true, price: 50 });
    const sword = battleWeapon({ name: "Épée", atk: 6, battle: { type: "dualblades", element: "ice" } });
    const goblin = battleEnemy({ name: "Gobelin", gain: { exp: 24, gold: 18 }, battle: { battler: "goblin", stats: stats(), weaknesses: ["fire"] } });
    const troop = battleTroop({ battle: { enemies: ["goblin", "goblin"], background: "meadow" } });

    expect(potion).toMatchObject({ _type: "item", price: 50 });
    expect(sword._type).toBe("weapon");
    expect(skillFromDb("fire", fire)).toMatchObject({ kind: "magical", scope: "allEnemies", spCost: 18, power: 105, fx: "fireball" });
    expect(itemFromDb("potion", potion)).toMatchObject({ scope: "ally", hp: 150 });
    expect(weaponFromDb(sword)?.attack).toMatchObject({ fx: "crossSlash", hits: 2, element: "ice" });
    expect(enemyFromDb(goblin)).toMatchObject({ battler: "goblin", rewards: { exp: 24, gold: 18 } });
    expect(troopFromDb("goblins", troop)).toMatchObject({ enemies: ["goblin", "goblin"], background: "meadow" });
  });

  it("read the triggers of a skill written in its battle data, for a skill and for a command", () => {
    const raw = { name: "Feu", battle: { triggers: ["cast", "defeat"], pinned: true } };

    expect(skillFromDb("fire", raw)!.triggers).toEqual(["cast", "defeat"]);
    expect(skillFromDb("plain", { name: "Simple" })!.triggers).toBeUndefined();
    expect(skillCommandFromDb("fire", raw)!.triggers).toEqual(["cast", "defeat"]);
  });

  it("reject typos at compile time (checked by `bun run typecheck`)", () => {
    // @ts-expect-error unknown scope
    battleSkill({ name: "x", battle: { scope: "enemies" } });
    // @ts-expect-error unknown skill kind
    battleSkill({ name: "x", battle: { kind: "fire" } });
    // @ts-expect-error an enemy needs a battler and stats
    battleEnemy({ name: "x", battle: { battler: "goblin" } });
    // @ts-expect-error hits is a number
    battleWeapon({ name: "x", battle: { hits: "2" } });
    // @ts-expect-error a troop lists its enemies
    battleTroop({ battle: { background: "meadow" } });
    // CanvasEngine presets are known names (autocompleted as `fx`).
    const presets: FxPresetName[] = ["swordSlash", "heavySlash", "fireball", "limitBurst", "statusStun"];
    // @ts-expect-error not a CanvasEngine preset
    const typo: FxPresetName = "swordslash";
    expect(presets.length + typo.length).toBeGreaterThan(0);
  });
});
