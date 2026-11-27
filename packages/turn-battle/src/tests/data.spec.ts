import { describe, expect, it } from "vitest";
import { turnBattleEnemy, turnBattleItem, turnBattleSkill, turnBattleTroop, turnBattleWeapon, type FxPresetName } from "../core";
import { enemyFromDb, itemFromDb, skillCommandFromDb, skillFromDb, troopFromDb, weaponFromDb } from "../server/database";
import { stats } from "./fixtures";

describe("typed database helpers", () => {
  it("keep native fields, add _type and read back as battle data", () => {
    const fire = turnBattleSkill({ name: "Brasier", spCost: 18, power: 105, turnBattle: { kind: "magical", scope: "allEnemies", element: "fire", fx: "fireball" } });
    const potion = turnBattleItem({ name: "Potion", hpValue: 150, consumable: true, price: 50 });
    const sword = turnBattleWeapon({ name: "Épée", atk: 6, turnBattle: { type: "dualblades", element: "ice" } });
    const goblin = turnBattleEnemy({ name: "Gobelin", gain: { exp: 24, gold: 18 }, turnBattle: { battler: "goblin", stats: stats(), weaknesses: ["fire"] } });
    const troop = turnBattleTroop({ turnBattle: { enemies: ["goblin", "goblin"], background: "meadow" } });

    expect(potion).toMatchObject({ _type: "item", price: 50 });
    expect(sword._type).toBe("weapon");
    expect(skillFromDb("fire", fire)).toMatchObject({ kind: "magical", scope: "allEnemies", spCost: 18, power: 105, fx: "fireball" });
    expect(itemFromDb("potion", potion)).toMatchObject({ scope: "ally", hp: 150 });
    expect(weaponFromDb(sword)?.attack).toMatchObject({ fx: "crossSlash", hits: 2, element: "ice" });
    expect(enemyFromDb(goblin)).toMatchObject({ battler: "goblin", rewards: { exp: 24, gold: 18 } });
    expect(troopFromDb("goblins", troop)).toMatchObject({ enemies: ["goblin", "goblin"], background: "meadow" });
  });

  it("read the triggers of a skill written in its battle data, for a skill and for a command", () => {
    const raw = { name: "Feu", turnBattle: { triggers: ["cast", "defeat"], pinned: true } };

    expect(skillFromDb("fire", raw)!.triggers).toEqual(["cast", "defeat"]);
    expect(skillFromDb("plain", { name: "Simple" })!.triggers).toBeUndefined();
    expect(skillCommandFromDb("fire", raw)!.triggers).toEqual(["cast", "defeat"]);
  });

  it("reject typos at compile time (checked by `bun run typecheck`)", () => {
    // @ts-expect-error unknown scope
    turnBattleSkill({ name: "x", turnBattle: { scope: "enemies" } });
    // @ts-expect-error unknown skill kind
    turnBattleSkill({ name: "x", turnBattle: { kind: "fire" } });
    // @ts-expect-error an enemy needs a battler and stats
    turnBattleEnemy({ name: "x", turnBattle: { battler: "goblin" } });
    // @ts-expect-error hits is a number
    turnBattleWeapon({ name: "x", turnBattle: { hits: "2" } });
    // @ts-expect-error a troop lists its enemies
    turnBattleTroop({ turnBattle: { background: "meadow" } });
    // CanvasEngine presets are known names (autocompleted as `fx`).
    const presets: FxPresetName[] = ["swordSlash", "heavySlash", "fireball", "limitBurst", "statusStun"];
    // @ts-expect-error not a CanvasEngine preset
    const typo: FxPresetName = "swordslash";
    expect(presets.length + typo.length).toBeGreaterThan(0);
  });
});
