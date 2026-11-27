import { describe, it, expect, vi, afterEach } from "vitest";
vi.mock("@rpgjs/server", () => ({ defineModule: (value: unknown) => value }));
vi.mock("@rpgjs/common", () => ({ createModule: (_name: string, value: unknown) => value }));
import { isInTacticalBattle, provideTacticalServer, startTacticalBattle, stopTacticalBattle, tacticalEncounter, tacticalItem, tacticalSkill, tacticalUnit } from "../server";
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

  it("calls a guest without a name by the tactical.player text of their language, never by their id", async () => {
    vi.useFakeTimers();
    provideTacticalServer();
    const { player, packets } = heroPlayer();
    (player as { name?: string }).name = undefined;
    (player as unknown as { t: (key: string, params: Record<string, unknown>) => string }).t = (key, params) =>
      key === "tactical.player" ? `Joueur ${params.index}` : key;
    void startTacticalBattle(player as never, "guard-room");
    await vi.advanceTimersByTimeAsync(0);
    const state = packets.at(-1)!.state;
    expect(state.players[0].name).toBe("Joueur 1");
    expect(state.units.find((u) => u.player === player.id)!.name).toBe("Joueur 1");
  });

  it("falls back on the English text when the player has no i18n service", async () => {
    vi.useFakeTimers();
    provideTacticalServer();
    const { player, packets } = heroPlayer();
    (player as { name?: string }).name = undefined;
    void startTacticalBattle(player as never, "guard-room");
    await vi.advanceTimersByTimeAsync(0);
    expect(packets.at(-1)!.state.players[0].name).toBe("Player 1");
  });

  it("joins knocked out when the player has no HP left (a battle is no free revival)", async () => {
    vi.useFakeTimers();
    provideTacticalServer();
    const { player, packets } = heroPlayer();
    player.hp = 0;
    void startTacticalBattle(player as never, "guard-room");
    await vi.advanceTimersByTimeAsync(0);
    expect(packets.at(-1)!.state.units.find((u) => u.player === player.id)!.hp).toBe(0);
  });

  it("fights with full HP and SP when the player has no native ones (no class: maxHp 0)", async () => {
    vi.useFakeTimers();
    provideTacticalServer();
    const { player, packets } = heroPlayer();
    player.hp = 0;
    player.sp = 0;
    player.param = { maxHp: 0, maxSp: 0, str: 22 };
    void startTacticalBattle(player as never, "guard-room");
    await vi.advanceTimersByTimeAsync(0);
    const hero = packets.at(-1)!.state.units.find((u) => u.player === player.id)!;
    expect(hero.hp).toBe(hero.maxHp);
    expect(hero.sp).toBe(hero.maxSp);
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

  it("ends the enemy phase when the AI has nothing to play, so the battle never stops there", async () => {
    vi.useFakeTimers();
    provideTacticalServer({ ai: () => null });
    const { player, packets, listeners } = heroPlayer();
    void startTacticalBattle(player as never, "guard-room");
    await vi.advanceTimersByTimeAsync(0);
    listeners.get("command")!({ revision: packets.at(-1)!.state.revision, command: { type: "start" } });
    await vi.advanceTimersByTimeAsync(2000);
    listeners.get("command")!({ revision: packets.at(-1)!.state.revision, command: { type: "endPhase" } });
    // Without a command from the AI, the enemy phase ends by itself.
    await vi.advanceTimersByTimeAsync(20000);
    const state = packets.at(-1)!.state;
    expect(state.phase).toBe("ally");
    expect(state.round).toBe(2);
  });

  it("gives a player who leaves their graphic back at once, before their session is saved", async () => {
    vi.useFakeTimers();
    provideTacticalServer();
    const { player } = heroPlayer();
    void startTacticalBattle(player as never, "guard-room");
    await vi.advanceTimersByTimeAsync(0);
    expect(player.setGraphic).toHaveBeenLastCalledWith("tactical-hidden");
    void stopTacticalBattle(player as never);
    // Synchronously: no timer has run yet.
    expect(player.setGraphic).toHaveBeenLastCalledWith(["aria"]);
  });
});

describe("a hook of the game that fails", () => {
  it("at the start: the battle does not open, and the player is shown again and free", async () => {
    vi.useFakeTimers();
    provideTacticalServer({ hooks: { onStart: () => { throw new Error("boom"); } } });
    const { player, gui } = heroPlayer();
    const start = startTacticalBattle(player as never, "guard-room");
    await expect(start).rejects.toThrow("boom");
    expect(isInTacticalBattle(player as never)).toBe(false);
    expect(gui.open).not.toHaveBeenCalled();
    // The map sprite is back, and nothing hides it again.
    expect(player.setGraphic).toHaveBeenLastCalledWith(["aria"]);
    const calls = player.setGraphic.mock.calls.length;
    await vi.advanceTimersByTimeAsync(2000);
    expect(player.setGraphic.mock.calls.length).toBe(calls);
  });

  it("on an order: the player reads that the order did not go through, not the error of the hook", async () => {
    vi.useFakeTimers();
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    provideTacticalServer({ hooks: { onCommand: (_p, _b, env) => { if (env.command.type === "endPhase") throw new Error("Cannot read quest"); } } });
    const { player, packets, listeners } = heroPlayer();
    void startTacticalBattle(player as never, "guard-room");
    await vi.advanceTimersByTimeAsync(0);
    listeners.get("command")!({ revision: packets.at(-1)!.state.revision, command: { type: "start" } });
    await vi.advanceTimersByTimeAsync(2000);
    listeners.get("command")!({ revision: packets.at(-1)!.state.revision, command: { type: "endPhase" } });
    await vi.advanceTimersByTimeAsync(0);
    expect(packets.at(-1)!.error).toBe("tactical.error.action");
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });
});
