import type { Catalog, CombatantDef, Stats } from "../core";
import { createBattle, type BattleSetup } from "../core";

export const stats = (over: Partial<Stats> = {}): Stats => ({
  maxHp: 300,
  maxSp: 60,
  atk: 40,
  def: 20,
  mag: 30,
  mdef: 20,
  agi: 30,
  luk: 10,
  ...over,
});

export const catalog: Pick<Catalog, "skills" | "items"> = {
  skills: {
    slash: { id: "slash", name: "Tranche", kind: "physical", scope: "enemy", power: 150, spCost: 10, melee: true, hits: 2 },
    fire: { id: "fire", name: "Feu", kind: "magical", scope: "allEnemies", power: 120, spCost: 15, element: "fire" },
    cure: { id: "cure", name: "Soin", kind: "heal", scope: "ally", power: 100, spCost: 8 },
    burst: { id: "burst", name: "Lumière", kind: "physical", scope: "allEnemies", power: 300, line: "Lumière !" },
  },
  items: {
    potion: { id: "potion", name: "Potion", scope: "ally", hp: 100 },
    phoenix: { id: "phoenix", name: "Plume", scope: "deadAlly", revive: true, hpRate: 0.3 },
  },
};

export const hero = (over: Partial<CombatantDef> = {}): CombatantDef => ({
  id: "hero",
  name: "Rain",
  side: "ally",
  battler: "knight",
  stats: stats({ agi: 40 }),
  skills: ["slash", "fire", "cure"],
  limit: { skill: "burst" },
  ...over,
});

export const goblin = (id: string, over: Partial<CombatantDef> = {}): CombatantDef => ({
  id,
  name: "Gobelin",
  side: "enemy",
  battler: "goblin",
  stats: stats({ maxHp: 120, atk: 25, agi: 20 }),
  weaknesses: ["fire"],
  stagger: 20,
  rewards: { exp: 10, gold: 5, items: [{ id: "potion", chance: 1 }] },
  ...over,
});

export const setup = (over: Partial<BattleSetup> = {}): BattleSetup => ({
  id: "b1",
  seed: 42,
  allies: [hero(), hero({ id: "mage", name: "Fina", battler: "mage", stats: stats({ agi: 25, mag: 50 }) })],
  enemies: [goblin("g1"), goblin("g2")],
  catalog,
  inventory: { potion: 2, phoenix: 1 },
  ...over,
});

export const battle = (over: Partial<BattleSetup> = {}) => createBattle(setup(over));
