import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RpgPlayer } from "@rpgjs/server";
import { DAMAGE_CRITICAL, DAMAGE_GUARD, DAMAGE_PHYSIC, DAMAGE_SKILL } from "@rpgjs/server";
import { turnBattleEnemy, turnBattleTroop, provideTurnBattleServer, startTurnBattle } from "../server";
import type { BattlePacket } from "../core";

/**
 * A game written for RPGJS alone: plain objects in the database, a native player. This is what a developer
 * writes to use the turn-based battle (see docs/turn-battle.md).
 */
const curve = (start: number, end = start) => ({ start, end });

const database = {
  fireball: { id: "fireball", name: "Fireball", spCost: 18, power: 105, element: "fire", coefficient: { int: 0.5 }, turnBattle: { scope: "allEnemies" } },
  potion: { id: "potion", name: "Potion", hpValue: 150, consumable: true, price: 50 },
  "iron-sword": { id: "iron-sword", name: "Iron sword", atk: 6, _type: "weapon" },
  "flame-sword": { id: "flame-sword", name: "Flame sword", atk: 6, _type: "weapon", elements: [{ rate: 1, element: "fire" }] },
  goblin: turnBattleEnemy({
    id: "goblin",
    name: "Goblin",
    battler: "goblin",
    parameters: { maxHp: curve(60), maxSp: curve(10), str: curve(8), pdef: curve(4), agi: curve(5), int: curve(3), dex: curve(3) },
    reward: { exp: 24, gold: 18, items: [{ itemId: "potion", amount: 1, chance: 100 }] },
    elementsEfficiency: [{ element: "fire", rate: 2 }],
  }),
  meadow: turnBattleTroop({ id: "meadow", name: "Meadow", enemies: ["goblin", "goblin"], background: "meadow" }),
};

const last = <T>(list: T[]) => list[list.length - 1];
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
let seq = 0;

/** The part of an RpgPlayer the battle talks to, with the shape RPGJS gives it. */
function rpgPlayer(over: Record<string, unknown> = {}) {
  const packets: BattlePacket[] = [];
  const handlers: Record<string, (data: any) => unknown> = {};
  let resolveOpen: (value: unknown) => void = () => {};
  const gui = {
    on: (name: string, cb: (data: any) => unknown) => (handlers[name] = cb),
    open: vi.fn((data: BattlePacket) => {
      packets.push(data);
      return new Promise((resolve) => (resolveOpen = resolve));
    }),
    update: vi.fn((data: BattlePacket) => packets.push(data)),
    close: vi.fn((data?: unknown) => resolveOpen(data ?? null)),
  };
  let saved: unknown = "";
  const player = {
    id: `native-${++seq}`,
    name: "Rain",
    hp: 480,
    sp: 60,
    exp: 0,
    gold: 0,
    param: { maxHp: 520, maxSp: 70, str: 46, int: 30, agi: 36, dex: 14 },
    atk: 6,
    pdef: 28,
    sdef: 20,
    skills: () => [{ id: () => "fireball" }],
    items: () => [{ id: () => "potion", quantity: () => 3 }],
    equipments: () => [{ id: () => "flame-sword" }],
    elementsEfficiency: [{ element: "ice", rate: 2 }],
    databaseById: (id: string) => {
      if (!(database as Record<string, unknown>)[id]) throw new Error("not found");
      return (database as Record<string, unknown>)[id];
    },
    getFormulas: (name: string) =>
      ({ damagePhysic: DAMAGE_PHYSIC, damageSkill: DAMAGE_SKILL, damageCritical: (d: number) => d, damageGuard: DAMAGE_GUARD })[name],
    turnBattle: Object.assign(() => saved, { set: (value: unknown) => (saved = value) }),
    hooks: {
      getHookFunctions: () => [],
      callHooks: () => ({ subscribe: (o: { next(v: unknown): void; complete(): void }) => (o.next([]), o.complete()) }),
    },
    gui: () => gui,
    getCurrentMap: () => ({ id: "map-1" }),
    removeItem: vi.fn(),
    addItem: vi.fn(),
    ...over,
  };
  return { player: player as unknown as RpgPlayer, packets, handlers };
}

describe("a game written with the native RPGJS data", () => {
  beforeEach(() => {
    provideTurnBattleServer({ battlers: { ally: "knight" } });
  });

  it("fights with the parameters, the skills and the items of the player", async () => {
    const { player, packets } = rpgPlayer();

    void startTurnBattle(player, "meadow", { seed: 1 });
    await flush();

    const hero = packets[0].state.combatants.find((c) => c.id === `player:${player.id}`)!;
    expect(hero).toMatchObject({ name: "Rain", hp: 480, sp: 60, skills: ["fireball"], battler: "knight" });
    expect(hero.stats).toMatchObject({ maxHp: 520, maxSp: 70, def: 28, mdef: 20, agi: 36 });
    expect(packets[0].state.inventory).toEqual({ [player.id]: { potion: 3 } });
  });

  it("puts the enemies of the troop on the stage, shaped like actors", async () => {
    const { player, packets } = rpgPlayer();

    void startTurnBattle(player, "meadow", { seed: 1 });
    await flush();

    const state = packets[0].state;
    const goblins = state.combatants.filter((c) => c.side === "enemy");
    expect(goblins.map((c) => c.name)).toEqual(["Goblin A", "Goblin B"]);
    expect(goblins[0].stats).toMatchObject({ maxHp: 60, atk: 8, def: 4 });
    expect(goblins[0].weaknesses).toEqual(["fire"]);
    expect(state.background).toBe("meadow");
  });

  it("uses the damage formulas of the map: the fire of the weapon hits a vulnerable goblin twice as hard", async () => {
    const { player, packets, handlers } = rpgPlayer();
    void startTurnBattle(player, "meadow", { seed: 1 });
    await flush();
    const state = last(packets).state;
    const target = state.combatants.find((c) => c.side === "enemy")!.id;

    await handlers.command({ revision: state.revision, actor: state.actor, command: { type: "attack", target } });

    const hit = last(packets).beats.find((beat) => beat.t === "action") as { waves: { amount: number; weak?: boolean }[][] };
    // RPGJS: (atk 6 − pdef 4 / 2) × ((20 + str 46) / 20) = 13, doubled by the vulnerability to fire.
    expect(hit.waves[0][0]).toMatchObject({ weak: true, amount: Math.round((6 - 4 / 2) * ((20 + 46) / 20)) * 2 });
  });

  it("gives the plugin formulas when the map has none, so a bare game still works", async () => {
    const { player, packets } = rpgPlayer({ getFormulas: () => undefined });

    void startTurnBattle(player, "meadow", { seed: 1 });
    await flush();

    expect(packets).toHaveLength(1);
  });

  it("plays to the victory and commits the rewards, the items and the experience", async () => {
    const { player, packets, handlers } = rpgPlayer();
    const done = startTurnBattle(player, "meadow", { seed: 1 });
    await flush();

    for (let turn = 0; turn < 60 && !last(packets).state.result; turn++) {
      const state = last(packets).state;
      const target = state.combatants.find((c) => c.side === "enemy" && c.hp > 0)!.id;
      await handlers.command({ revision: state.revision, actor: state.actor, command: { type: "attack", target } });
    }
    await handlers.close({});
    const result = await done;

    expect(result.outcome).toBe("victory");
    expect((player as any).exp).toBe(result.exp);
    expect((player as any).gold).toBe(result.gold);
    expect((player as any).addItem).toHaveBeenCalledWith("potion", expect.any(Number));
  });

  it("asks for a battler when neither the enemy nor the options give one", async () => {
    provideTurnBattleServer({});
    const noBattler = { ...database, goblin: { ...database.goblin, battler: undefined } };
    const { player } = rpgPlayer({ databaseById: (id: string) => (noBattler as Record<string, unknown>)[id] });

    await expect(startTurnBattle(player, "meadow")).rejects.toThrow(/no battler/);
  });
});
