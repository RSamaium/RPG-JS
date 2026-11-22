import { describe, it, expect, vi, afterEach } from "vitest";
vi.mock("@rpgjs/server", () => ({ defineModule: (value: unknown) => value }));
vi.mock("@rpgjs/common", () => ({ createModule: (_name: string, value: unknown) => value }));
import { provideTacticalServer, startTacticalBattle, tacticalEncounter, tacticalItem, tacticalSkill, tacticalUnit } from "../server";
import type { BattlePacket } from "../core/types";

afterEach(() => vi.useRealTimers());

const database: Record<string, unknown> = {
  "ember-nova": tacticalSkill({ name: "Ember nova", spCost: 6, power: 30, tactical: { range: 3, shape: "square", visual: "fire", color: 0xff995d } }),
  walk: { _type: "skill", name: "Walk" }, // a skill of the map, nothing a tactical battle can use
  potion: tacticalItem({ name: "Potion", hpValue: 40 }),
  key: { _type: "item", name: "Key" },
  wolf: tacticalUnit({ name: "Wolf", tactical: { role: "warrior", battler: "wolf", stats: { hp: 40, sp: 0, power: 8, range: 1, move: 3 } } }),
  "guard-room": tacticalEncounter({
    name: "Guard room",
    tactical: { allies: [{ hero: true, x: 2, y: 4 }], enemies: [{ unit: "wolf", x: 2, y: 0 }] },
  }),
};

/** A player of the map, with the native fields a battle reads. */
let count = 0;
function heroPlayer() {
  let resolveOpen: (value: unknown) => void = () => {};
  const packets: BattlePacket[] = [];
  const listeners = new Map<string, (data?: any) => void>();
  const gui = {
    open: vi.fn((data: BattlePacket) => {
      packets.push(data);
      return new Promise((resolve) => (resolveOpen = resolve));
    }),
    update: (data: BattlePacket) => packets.push(data),
    on: (name: string, cb: (data?: any) => void) => listeners.set(name, cb),
    close: vi.fn((result: unknown) => resolveOpen(result)),
  };
  const player = {
    id: `hero-player-${++count}`,
    name: "Aria",
    hp: 90,
    sp: 14,
    param: { maxHp: 120, maxSp: 30, str: 22 },
    graphics: ["aria"],
    x: 0,
    y: 0,
    setGraphic: vi.fn(),
    skills: () => [{ id: "ember-nova" }, { id: "walk" }],
    items: () => [{ id: "potion", quantity: 3 }, { id: "key", quantity: 1 }],
    equipments: () => [],
    removeItem: vi.fn(),
    databaseById: (id: string) => {
      if (!database[id]) throw new Error("not found");
      return database[id];
    },
    gui: () => gui,
  };
  return { player, gui, packets, listeners };
}

describe("the hero of a player in a tactical battle", () => {
  it("is read from the player: HP, SP, parameters, the skills and items a tactical battle can use", async () => {
    vi.useFakeTimers();
    provideTacticalServer();
    const { player, packets } = heroPlayer();
    void startTacticalBattle(player as never, "guard-room");
    await vi.advanceTimersByTimeAsync(0);

    const hero = packets.at(-1)!.state.units.find((u) => u.player === player.id)!;
    expect(hero).toMatchObject({ id: `hero-${player.id}`, name: "Aria", battler: "aria", hp: 90, maxHp: 120, sp: 14, maxSp: 30, power: 22, owner: player.id });
    expect(hero.skillIds).toEqual(["ember-nova"]);
    expect(hero.items).toEqual({ potion: 3 });
    expect(packets.at(-1)!.state.skills["ember-nova"]).toMatchObject({ spCost: 6, power: 30, range: 3 });
  });

  it("writes HP, SP and the items spent back on the player at the end", async () => {
    vi.useFakeTimers();
    provideTacticalServer({ hero: () => ({ stats: { hp: 0, sp: 0, power: 22, range: 1, move: 3 } }) });
    const { player, packets, listeners } = heroPlayer();
    const done = startTacticalBattle(player as never, "guard-room");
    await vi.advanceTimersByTimeAsync(0);
    const send = async (command: unknown) => {
      listeners.get("command")!({ revision: packets.at(-1)!.state.revision, command });
      await vi.advanceTimersByTimeAsync(2000);
    };
    await send({ type: "start" });
    const hero = () => packets.at(-1)!.state.units.find((u) => u.player === player.id)!;
    await send({ type: "item", unitId: hero().id, itemId: "potion", targetId: hero().id });
    // The hero has played: the enemy phase runs, then the heroes flee.
    await vi.advanceTimersByTimeAsync(20000);
    await send({ type: "escape" });
    expect(packets.at(-1)!.state.winner).toBe("enemy");

    const after = hero();
    expect(after.items.potion).toBe(2);
    listeners.get("close")?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(player.hp).toBe(after.hp);
    expect(player.sp).toBe(after.sp);
    expect(player.removeItem).toHaveBeenCalledWith("potion", 1);
    await done;
  });
});
