import { describe, expect, it } from "vitest";
import { enemyFromDb, skillFromDb, troopFromDb, weaponFromDb } from "../server/database";

const curve = (start: number, end = start) => ({ start, end });

/** An enemy shaped like an RPGJS actor. */
const goblin = {
  id: "goblin",
  name: "Goblin",
  battler: "goblin-sprite",
  initialLevel: 1,
  finalLevel: 99,
  parameters: {
    maxHp: curve(100, 1000),
    maxSp: curve(20, 200),
    str: curve(10, 108),
    pdef: curve(5, 103),
    agi: curve(12, 110),
    int: curve(8, 106),
    dex: curve(6, 104),
  },
  reward: { exp: 24, gold: 18, items: [{ itemId: "potion", amount: 2, chance: 50 }] },
};

describe("an enemy shaped like an RPGJS actor", () => {
  it("reads its parameters at the initial level", () => {
    expect(enemyFromDb(goblin)?.stats).toEqual({ maxHp: 100, maxSp: 20, atk: 10, def: 5, mag: 8, mdef: 5, agi: 12, luk: 6, str: 10, int: 8, dex: 6 });
  });

  it("interpolates the parameters between the first and the last level", () => {
    const stats = enemyFromDb({ ...goblin, initialLevel: 50 })?.stats;

    expect(stats?.maxHp).toBe(550);
    expect(stats?.atk).toBe(59);
  });

  it("keeps the starting value when the enemy has only one level", () => {
    expect(enemyFromDb({ ...goblin, finalLevel: 1 })?.stats.maxHp).toBe(100);
  });

  it("adds the atk parameter to the strength and reads sdef as the magic defense", () => {
    const stats = enemyFromDb({ ...goblin, parameters: { ...goblin.parameters, atk: curve(7), sdef: curve(9) } })?.stats;

    expect(stats?.atk).toBe(17);
    expect(stats?.str).toBe(10);
    expect(stats?.mdef).toBe(9);
    expect(stats?.def).toBe(5);
  });

  it("falls back on a level 1 enemy without maxSp, dex or levels", () => {
    const { maxSp, dex, ...parameters } = goblin.parameters;
    const stats = enemyFromDb({ ...goblin, initialLevel: undefined, finalLevel: undefined, parameters })?.stats;

    // The missing ones are the default ones of RPGJS.
    expect(stats).toMatchObject({ maxHp: 100, maxSp: 534, luk: 54 });
  });

  it("turns the rewards into battle rewards, the chance of an item being a percentage", () => {
    expect(enemyFromDb(goblin)?.rewards).toEqual({ exp: 24, gold: 18, items: [{ id: "potion", quantity: 2, chance: 0.5 }] });
  });

  it("gives an item that has no chance a chance of 100 %", () => {
    expect(enemyFromDb({ ...goblin, reward: { items: [{ itemId: "potion" }] } })?.rewards?.items).toEqual([
      { id: "potion", quantity: 1, chance: 1 },
    ]);
  });

  it("keeps the battle appearance, the skills and the elements efficiency", () => {
    const enemy = enemyFromDb({
      ...goblin,
      skills: ["bite"],
      weapon: "knife",
      stagger: 40,
      commands: ["steal"],
      ai: "careful",
      elementsEfficiency: [{ element: "fire", rate: 2 }],
    });

    expect(enemy).toMatchObject({
      name: "Goblin",
      battler: "goblin-sprite",
      skills: ["bite"],
      weapon: "knife",
      stagger: 40,
      commands: ["steal"],
      ai: "careful",
      elementsEfficiency: [{ element: "fire", rate: 2 }],
    });
  });

  it("has no battler when none is given, the server choosing a default", () => {
    expect(enemyFromDb({ ...goblin, battler: undefined })?.battler).toBeUndefined();
  });

  it("fights with the default parameters of RPGJS when the record has none, as an enemy made before they existed", () => {
    const enemy = enemyFromDb({ name: "Zombie", graphic: "sprite" });

    expect(enemy?.name).toBe("Zombie");
    expect(enemy?.stats).toEqual({ maxHp: 741, maxSp: 534, atk: 67, def: 50, mag: 36, mdef: 50, agi: 58, luk: 54, str: 67, int: 36, dex: 54 });
  });

  it("completes the parameters that are missing with the default ones, keeping the others", () => {
    const stats = enemyFromDb({ name: "Half", parameters: { maxHp: curve(100, 200), str: curve(10) } })?.stats;

    expect(stats).toMatchObject({ maxHp: 100, atk: 10, def: 50, agi: 58 });
  });

  it("is nothing without a record", () => {
    expect(enemyFromDb(undefined)).toBeUndefined();
  });

  it("keeps reading the previous shape, with `turnBattle: { battler, stats }`", () => {
    const stats = { maxHp: 1, maxSp: 1, atk: 1, def: 1, mag: 1, mdef: 1, agi: 1, luk: 1 };

    expect(enemyFromDb({ name: "Old", gain: { exp: 3 }, turnBattle: { battler: "b", stats } })).toMatchObject({
      battler: "b",
      stats,
      rewards: { exp: 3 },
    });
  });
});

describe("a troop", () => {
  it("lists the enemies, a twice listed enemy being two enemies", () => {
    expect(troopFromDb("pack", { name: "Pack", enemies: ["goblin", "goblin", "wolf"], background: "meadow", bgm: "fight", canEscape: false })).toEqual({
      id: "pack",
      name: "Pack",
      enemies: ["goblin", "goblin", "wolf"],
      background: "meadow",
      bgm: "fight",
      canEscape: false,
    });
  });

  it("ignores a record without enemies", () => {
    expect(troopFromDb("t", { name: "Empty" })).toBeUndefined();
    expect(troopFromDb("t", undefined)).toBeUndefined();
  });

  it("keeps reading the previous shape, with its data in `battle`", () => {
    expect(troopFromDb("t", { turnBattle: { enemies: ["goblin"], background: "meadow" } })).toMatchObject({
      id: "t",
      enemies: ["goblin"],
      background: "meadow",
    });
  });
});

describe("a skill with native fields", () => {
  it("reads the element, the cost, the power and the coefficient of RPGJS", () => {
    expect(skillFromDb("fire", { name: "Fire", spCost: 18, power: 105, element: "fire", coefficient: { int: 1 } })).toMatchObject({
      id: "fire",
      name: "Fire",
      spCost: 18,
      power: 105,
      element: "fire",
      coefficient: { int: 1 },
    });
  });

  it("is a physical skill on one enemy unless `battle` says otherwise", () => {
    expect(skillFromDb("hit", { name: "Hit", power: 50 })).toMatchObject({ kind: "physical", scope: "enemy" });
    expect(skillFromDb("heal", { name: "Heal", turnBattle: { kind: "heal", scope: "ally" } })).toMatchObject({ kind: "heal", scope: "ally" });
  });

  it("lets `battle` override the native element", () => {
    expect(skillFromDb("s", { name: "S", element: "fire", turnBattle: { element: "ice" } })?.element).toBe("ice");
  });

  it("ignores the native element `none`", () => {
    expect(skillFromDb("s", { name: "S", element: "none" })?.element).toBeUndefined();
  });
});

describe("a weapon with native fields", () => {
  it("takes the element of its attack from the native `elements`", () => {
    const weapon = weaponFromDb({ _type: "weapon", name: "Flame", atk: 9, elements: [{ rate: 1, element: "fire" }] });

    expect(weapon).toMatchObject({ atk: 9, attack: { element: "fire" } });
  });

  it("lets `battle.element` override the native elements", () => {
    const weapon = weaponFromDb({ _type: "weapon", name: "Flame", elements: [{ rate: 1, element: "fire" }], turnBattle: { element: "ice" } });

    expect(weapon?.attack.element).toBe("ice");
  });
});
