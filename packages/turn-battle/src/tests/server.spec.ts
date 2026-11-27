import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RpgPlayer } from "@rpgjs/server";
import {
  clearLimits,
  getTurnBattle,
  getLimit,
  getLimits,
  heroId,
  isInTurnBattle,
  provideTurnBattleServer,
  setLimit,
  startTurnBattle,
  watchTurnBattle,
} from "../server";
import { actionCommand, turnBattleCommand, type BattlePacket } from "../core";
import { catalog, goblin, stats } from "./fixtures";

let seq = 0;

/** Minimal RpgPlayer double: GUI round-trips, native data, database, module hooks. */
function fakePlayer(
  opts: { database?: Record<string, any>; hooks?: Record<string, ((...a: any[]) => any)[]>; equipped?: string[]; map?: string } = {},
) {
  const id = `p${++seq}`;
  const packets: BattlePacket[] = [];
  const handlers: Record<string, (data: any) => unknown> = {};
  let resolveOpen: (v: unknown) => void = () => {};
  const gui = {
    on: (name: string, cb: (data: any) => unknown) => (handlers[name] = cb),
    open: vi.fn((data: BattlePacket) => {
      packets.push(data);
      return new Promise((r) => (resolveOpen = r));
    }),
    update: vi.fn((data: BattlePacket) => packets.push(data)),
    close: vi.fn((data?: unknown) => resolveOpen(data ?? null)),
  };
  let saved: unknown = "";
  const hookFns = opts.hooks ?? {};
  const player = {
    id,
    name: "Rain",
    hp: 300,
    sp: 20,
    exp: 5,
    gold: 10,
    param: { maxHp: 400, maxSp: 50, str: 40, int: 25, agi: 30, dex: 10 },
    atk: 12,
    pdef: 18,
    sdef: 14,
    skills: () => [{ id: "slash" }, { id: "unknown" }, { id: "db-skill" }],
    items: () => [{ id: () => "potion", quantity: () => 2 }, { id: () => "key", quantity: () => 1 }],
    databaseById: (key: string) => {
      if (!opts.database?.[key]) throw new Error("not found");
      return opts.database[key];
    },
    turnBattle: Object.assign(() => saved, { set: (v: unknown) => (saved = v) }),
    hooks: {
      getHookFunctions: (name: string) => hookFns[name] ?? [],
      callHooks: (name: string, ...args: unknown[]) => ({
        subscribe: (o: { next(v: unknown): void; complete(): void }) => {
          Promise.all((hookFns[name] ?? []).map((fn) => fn(...args))).then((r) => {
            o.next(r);
            o.complete();
          });
        },
      }),
    },
    equipments: () => (opts.equipped ?? []).map((w) => ({ id: () => w })),
    gui: () => gui,
    getCurrentMap: () => ({ id: opts.map ?? "map-1" }),
    removeItem: vi.fn(),
    addItem: vi.fn(),
  };
  return { player: player as unknown as RpgPlayer & typeof player, packets, handlers, gui, saved: () => saved };
}

const last = <T>(list: T[]) => list[list.length - 1];

async function playToEnd(packets: BattlePacket[], handlers: Record<string, (d: any) => unknown>) {
  for (let i = 0; i < 60 && !last(packets).state.result; i++) {
    const s = last(packets).state;
    const target = s.combatants.find((c) => c.side === "enemy" && c.hp > 0)!.id;
    await handlers.command({ revision: s.revision, actor: s.actor, command: { type: "attack", target } });
  }
  return last(packets).state.result!;
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("startTurnBattle", () => {
  beforeEach(() => {
    provideTurnBattleServer({
      ...catalog,
      enemies: { goblin: goblin("x", { stats: stats({ maxHp: 60, atk: 5, agi: 5 }) }) },
      troops: { duo: { id: "duo", enemies: ["goblin", "goblin"] } },
      hero: () => ({ battler: "knight", limit: { skill: "burst" } }),
    });
  });

  it("reads the native player, plays to victory and commits the outcome", async () => {
    const { player, packets, handlers, gui } = fakePlayer();
    const done = startTurnBattle(player, "duo", { seed: 3 });
    await flush();
    expect(isInTurnBattle(player)).toBe(true);
    expect(gui.open).toHaveBeenCalledWith(expect.objectContaining({ battleId: expect.any(String) }), {
      waitingAction: true,
      blockPlayerInput: true,
    });

    const first = packets[0];
    const me = first.state.combatants.find((c) => c.id === `player:${player.id}`)!;
    expect(me).toMatchObject({ hp: 300, sp: 20, skills: ["slash"], owner: player.id });
    expect(me.stats.maxHp).toBe(400);
    expect(first.state.inventory).toEqual({ [player.id]: { potion: 2 } });

    const result = await playToEnd(packets, handlers);
    expect(result.outcome).toBe("victory");
    // Committed as soon as the result is known, before the player closes the screen.
    expect(player.exp).toBe(5 + result.exp);
    expect(player.gold).toBe(10 + result.gold);
    expect(player.addItem).toHaveBeenCalledWith("potion", expect.any(Number));

    await handlers.close({});
    await expect(done).resolves.toEqual(result);
    expect(isInTurnBattle(player)).toBe(false);
  });

  it("answers stale commands with an error packet and keeps the state", async () => {
    const { player, packets, handlers } = fakePlayer();
    void startTurnBattle(player, "duo", { seed: 3 });
    await flush();
    const s = last(packets).state;
    await handlers.command({ revision: s.revision - 1, actor: s.actor, command: { type: "guard" } });
    expect(last(packets)).toMatchObject({ error: "turnBattle.error.stale", revision: s.revision, beats: [] });
  });

  it("refuses a second battle and resolves as escape when aborted", async () => {
    const { player, gui } = fakePlayer();
    const done = startTurnBattle(player, "duo");
    await expect(startTurnBattle(player, "duo")).rejects.toThrow(/already in a battle/);
    await flush();
    gui.close(null);
    await expect(done).resolves.toMatchObject({ outcome: "escape", exp: 0 });
    expect(player.addItem).not.toHaveBeenCalled();
  });

  it("reads skills, enemies and troops from the RPGJS database", async () => {
    const database = {
      "db-skill": { name: "Éclair", spCost: 4, power: 130, turnBattle: { kind: "magical", scope: "enemy", element: "thunder" } },
      slime: { _type: "enemy", name: "Slime", gain: { exp: 7, gold: 3 }, turnBattle: { battler: "slime", stats: stats({ maxHp: 30, agi: 5 }) } },
      pond: { _type: "troop", turnBattle: { enemies: ["slime"], background: "meadow" } },
    };
    const { player, packets } = fakePlayer({ database });
    void startTurnBattle(player, "pond", { seed: 1 });
    await flush();
    const s = packets[0].state;
    expect(s.catalog.skills["db-skill"]).toMatchObject({ name: "Éclair", spCost: 4, power: 130, kind: "magical" });
    expect(s.combatants.find((c) => c.id === `player:${player.id}`)!.skills).toContain("db-skill");
    expect(s.combatants.find((c) => c.side === "enemy")).toMatchObject({ name: "Slime", rewards: { exp: 7, gold: 3 } });
    expect(s.background).toBe("meadow");
  });

  it("calls module hooks: rule hooks, command veto, start/end, and persists limit gauges", async () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();
    const hooks = {
      "server-turnBattle-onStart": [onStart],
      "server-turnBattle-onEnd": [onEnd],
      "server-turnBattle-onDamage": [({ target }: any) => (target.side === "enemy" ? 999 : undefined)],
      "server-turnBattle-onCommand": [(_p: unknown, _b: unknown, env: any) => (env.command.type === "escape" ? false : undefined)],
    };
    const { player, packets, handlers, saved } = fakePlayer({ hooks });
    void startTurnBattle(player, "duo", { seed: 5 });
    await flush();
    expect(onStart).toHaveBeenCalled();
    const s = last(packets).state;
    await handlers.command({ revision: s.revision, actor: s.actor, command: { type: "escape" } });
    expect(last(packets).error).toBe("turnBattle.error.refused");
    const result = await playToEnd(packets, handlers);
    expect(result.outcome).toBe("victory");
    const damage = packets.flatMap((p) => p.beats).flatMap((b) => (b.t === "action" ? b.waves.flat() : []));
    expect(damage.filter((h) => h.kind === "damage" && h.target.startsWith("goblin")).every((h) => h.amount === 999)).toBe(true);
    expect(onEnd).toHaveBeenCalledWith(player, expect.anything(), result);
    expect(JSON.parse(saved() as any).limits[`player:${player.id}`]).toBeGreaterThan(0);
  });

  it("derives the basic attack from the equipped weapon (effect, hits, element, atk)", async () => {
    const database = {
      fangs: { _type: "weapon", name: "Crocs", atk: 9, turnBattle: { type: "dualblades", element: "ice" } },
      knife: { _type: "weapon", name: "Surin", atk: 2, turnBattle: { type: "dagger" } },
      imp: { _type: "enemy", name: "Imp", turnBattle: { battler: "imp", stats: stats({ maxHp: 999, agi: 1 }), weapon: "knife" } },
      den: { _type: "troop", turnBattle: { enemies: ["imp"] } },
    };
    const { player, packets, handlers } = fakePlayer({ database, equipped: ["fangs"] });
    void startTurnBattle(player, "den", { seed: 2 });
    await flush();
    const s = packets[0].state;
    const me = s.combatants.find((c) => c.id === `player:${player.id}`)!;
    expect(me.attack).toMatchObject({ fx: "crossSlash", hits: 2, element: "ice", weapon: "Crocs", melee: true });
    expect(s.combatants.find((c) => c.side === "enemy")!.attack).toMatchObject({ fx: "comboHits", hits: 3 });
    const target = s.combatants.find((c) => c.side === "enemy")!.id;
    // Play hero turns until the hero itself attacks.
    let action;
    for (let i = 0; i < 6 && !action; i++) {
      const st = last(packets).state;
      await handlers.command({ revision: st.revision, actor: st.actor, command: { type: "attack", target } });
      action = last(packets).beats.find((b) => b.t === "action" && b.actor === me.id);
    }
    expect(action).toMatchObject({ fx: "crossSlash", element: "ice", label: "Crocs" });
    expect((action as any).waves.length).toBe(2);
  });
});

describe("coop", () => {
  beforeEach(() => {
    provideTurnBattleServer({
      ...catalog,
      enemies: { goblin: goblin("x", { stats: stats({ maxHp: 90, atk: 5, agi: 5 }) }) },
      troops: { duo: { id: "duo", enemies: ["goblin", "goblin"] } },
      hero: (_p, { index }) => ({ battler: index ? "mage" : "knight", limit: { skill: "burst" } }),
      party: (player, { players }) =>
        players.length > 1 ? [] : [{ id: `pet:${player.id}`, name: "Pet", side: "ally", battler: "pet", stats: stats() }],
    });
  });

  const byOwner = (...seats: ReturnType<typeof fakePlayer>[]) => (owner: string) =>
    seats.find((s) => s.player.id === owner)!;

  async function coopToEnd(seats: ReturnType<typeof fakePlayer>[]) {
    const seat = byOwner(...seats);
    for (let i = 0; i < 80 && !last(seats[0].packets).state.result; i++) {
      const s = last(seats[0].packets).state;
      const actor = s.combatants.find((c) => c.id === s.actor)!;
      const target = s.combatants.find((c) => c.side === "enemy" && c.hp > 0)!.id;
      await seat(actor.owner!).handlers.command({ revision: s.revision, actor: actor.id, command: { type: "attack", target } });
    }
    return last(seats[0].packets).state.result!;
  }

  it("sends every packet to each player, with its own units and bag, and commits both", async () => {
    const a = fakePlayer();
    const b = fakePlayer();
    const done = startTurnBattle({ players: [a.player, b.player], troop: "duo", seed: 4, turnTimer: false });
    await flush();
    expect(isInTurnBattle(a.player) && isInTurnBattle(b.player)).toBe(true);
    expect(a.packets[0]).toMatchObject({ viewer: a.player.id, players: { [a.player.id]: "Rain", [b.player.id]: "Rain" } });
    expect(b.packets[0].viewer).toBe(b.player.id);
    const allies = a.packets[0].state.combatants.filter((c) => c.side === "ally");
    expect(allies.map((c) => [c.owner, c.battler])).toEqual([[a.player.id, "knight"], [b.player.id, "mage"]]);
    expect(a.packets[0].state.inventory).toEqual({ [a.player.id]: { potion: 2 }, [b.player.id]: { potion: 2 } });

    // The other player cannot command my hero; only they get the error.
    const s = last(a.packets).state;
    const owner = s.combatants.find((c) => c.id === s.actor)!.owner!;
    const intruder = owner === a.player.id ? b : a;
    const before = a.packets.length + b.packets.length;
    await intruder.handlers.command({ revision: s.revision, actor: s.actor, command: { type: "guard" } });
    expect(last(intruder.packets).error).toBe("turnBattle.error.notYourTurn");
    expect(a.packets.length + b.packets.length).toBe(before + 1);

    const result = await coopToEnd([a, b]);
    expect(result.outcome).toBe("victory");
    expect(last(b.packets).state.result).toEqual(result);
    expect(a.player.exp).toBe(5 + result.exp);
    expect(b.player.exp).toBe(5 + result.exp);

    // Each player leaves the result screen on their own; the battle resolves after both.
    await a.handlers.close({});
    expect(isInTurnBattle(a.player)).toBe(false);
    expect(isInTurnBattle(b.player)).toBe(true);
    await b.handlers.close({});
    await expect(done).resolves.toEqual(result);
  });

  it("names the players and heroes without a name with the i18n keys of the player's language", async () => {
    const a = fakePlayer();
    const b = fakePlayer();
    for (const { player } of [a, b]) {
      (player as any).name = "";
      (player as any).t = (key: string, params?: Record<string, unknown>) => `${key}:${JSON.stringify(params ?? {})}`;
    }
    void startTurnBattle({ players: [a.player, b.player], troop: "duo", seed: 4, turnTimer: false });
    await flush();
    expect(a.packets[0].players).toEqual({
      [a.player.id]: 'turnBattle.player:{"index":1}',
      [b.player.id]: 'turnBattle.player:{"index":2}',
    });
    const hero = a.packets[0].state.combatants.find((c) => c.id === `player:${b.player.id}`)!;
    expect(hero.name).toBe("turnBattle.hero:{}");
  });

  it("falls back on the English texts of the module when the player has no i18n service", async () => {
    const a = fakePlayer();
    const b = fakePlayer();
    (a.player as any).name = "";
    (b.player as any).name = "";
    void startTurnBattle({ players: [a.player, b.player], troop: "duo", seed: 4, turnTimer: false });
    await flush();
    expect(Object.values(a.packets[0].players ?? {})).toEqual(["Player 1", "Player 2"]);
    expect(a.packets[0].state.combatants.find((c) => c.id === `player:${a.player.id}`)!.name).toBe("Hero");
  });

  it("hands a disconnected player's hero to the AI and commits only for the others", async () => {
    const a = fakePlayer();
    const b = fakePlayer();
    const done = startTurnBattle({ players: [a.player, b.player], troop: "duo", seed: 8, turnTimer: false });
    await flush();
    // RPGJS calls the plugin's player.onDisconnected hook.
    const onDisconnected = findHook(provideTurnBattleServer({ ...catalog }), "onDisconnected");
    onDisconnected(b.player);
    expect(isInTurnBattle(b.player)).toBe(false);
    expect(b.gui.close).toHaveBeenCalledWith(null);

    // Only A plays now: B's hero acts on its own.
    for (let i = 0; i < 80 && !last(a.packets).state.result; i++) {
      const s = last(a.packets).state;
      expect(s.combatants.find((c) => c.id === s.actor)!.owner).toBe(a.player.id);
      const target = s.combatants.find((c) => c.side === "enemy" && c.hp > 0)!.id;
      await a.handlers.command({ revision: s.revision, actor: s.actor, command: { type: "attack", target } });
    }
    const beats = a.packets.flatMap((p) => p.beats);
    expect(beats.some((bt) => bt.t === "action" && bt.actor === `player:${b.player.id}`)).toBe(true);
    const result = last(a.packets).state.result!;
    expect(result.outcome).toBe("victory");
    expect(b.player.exp).toBe(5);
    await a.handlers.close({});
    await expect(done).resolves.toEqual(result);
  });

  it("guards automatically when a player lets the turn timer run out", async () => {
    vi.useFakeTimers();
    try {
      const a = fakePlayer();
      const b = fakePlayer();
      void startTurnBattle({ players: [a.player, b.player], troop: "duo", seed: 4, turnTimer: 5 });
      await vi.advanceTimersByTimeAsync(0);
      const s = last(a.packets).state;
      expect(a.packets[0].turnTimer).toBe(5);
      await vi.advanceTimersByTimeAsync(60_000);
      const next = a.packets.find((p) => p.revision === s.revision + 1)!;
      expect(next.beats[0]).toMatchObject({ t: "guard", actor: s.actor });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("a hook or a command of the game that fails", () => {
  it("does not freeze the battle: the order is refused and the player gets their turn back", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    provideTurnBattleServer({
      ...catalog,
      enemies: { goblin: goblin("x", { stats: stats({ maxHp: 60, atk: 5, agi: 5 }) }) },
      troops: { duo: { id: "duo", enemies: ["goblin", "goblin"] } },
      hero: () => ({ battler: "knight" }),
      hooks: { onCommand: (_p, _b, env) => { if (env.command.type === "guard") throw new Error("boom"); } },
    });
    const { player, packets, handlers } = fakePlayer();
    void startTurnBattle(player, "duo", { seed: 3 });
    await flush();
    const s = last(packets).state;
    await handlers.command({ revision: s.revision, actor: s.actor, command: { type: "guard" } });
    expect(last(packets)).toMatchObject({ error: "turnBattle.error.invalid", revision: s.revision, beats: [] });
    // The same turn can still be played.
    const target = s.combatants.find((c) => c.side === "enemy")!.id;
    await handlers.command({ revision: s.revision, actor: s.actor, command: { type: "attack", target } });
    expect(last(packets).revision).toBe(s.revision + 1);
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });

  it("frees a spectator whose onSpectate hook fails", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    provideTurnBattleServer({
      ...catalog,
      enemies: { goblin: goblin("x", { stats: stats({ maxHp: 90, atk: 5, agi: 5 }) }) },
      troops: { duo: { id: "duo", enemies: ["goblin", "goblin"] } },
      hero: () => ({ battler: "knight" }),
      hooks: { onSpectate: () => { throw new Error("boom"); } },
    });
    const fighter = fakePlayer();
    const watcher = fakePlayer();
    const late = fakePlayer();
    void startTurnBattle({ players: [fighter.player], troop: "duo", seed: 4, spectators: [late.player] });
    await flush();
    // Started with the battle: logged, not left unhandled, and freed.
    expect(isInTurnBattle(late.player)).toBe(false);
    await expect(watchTurnBattle(watcher.player, fighter.player)).rejects.toThrow("boom");
    expect(isInTurnBattle(watcher.player)).toBe(false);
    errors.mockRestore();
  });
});

describe("spectators", () => {
  beforeEach(() => {
    provideTurnBattleServer({
      ...catalog,
      enemies: { goblin: goblin("x", { stats: stats({ maxHp: 90, atk: 5, agi: 5 }) }) },
      troops: { duo: { id: "duo", enemies: ["goblin", "goblin"] } },
      hero: () => ({ battler: "knight" }),
    });
  });

  it("joins a running battle, sees every packet, cannot command and leaves at will", async () => {
    const fighter = fakePlayer();
    const watcher = fakePlayer();
    const done = startTurnBattle(fighter.player, "duo", { seed: 4 });
    await flush();
    // Play one turn before the spectator arrives.
    let s = last(fighter.packets).state;
    const target = s.combatants.find((c) => c.side === "enemy")!.id;
    await fighter.handlers.command({ revision: s.revision, actor: s.actor, command: { type: "attack", target } });
    s = last(fighter.packets).state;

    expect(getTurnBattle(fighter.player)?.players).toEqual([fighter.player]);
    const watching = watchTurnBattle(watcher.player, fighter.player);
    await flush();
    expect(isInTurnBattle(watcher.player)).toBe(true);
    expect(getTurnBattle(watcher.player)).toBeUndefined(); // watching, not fighting
    expect(watcher.packets[0]).toMatchObject({ spectator: true, viewer: watcher.player.id, revision: s.revision, beats: [] });
    expect(last(fighter.packets)).toMatchObject({ spectators: 1, revision: s.revision });
    expect(getTurnBattle(fighter.player)!.spectators()).toEqual([watcher.player]);
    expect(watcher.handlers.command).toBeUndefined();

    // Live: the fighter's next command reaches the spectator too.
    await fighter.handlers.command({ revision: s.revision, actor: s.actor, command: { type: "guard" } });
    expect(last(watcher.packets).revision).toBe(last(fighter.packets).revision);
    expect(last(watcher.packets).beats[0]).toMatchObject({ t: "guard" });

    await watcher.handlers.close({});
    await expect(watching).resolves.toBe(true);
    expect(isInTurnBattle(watcher.player)).toBe(false);
    expect(last(fighter.packets).spectators).toBe(0);

    const result = await playToEnd(fighter.packets, fighter.handlers);
    expect(watcher.player.exp).toBe(5); // spectators get nothing
    await fighter.handlers.close({});
    await expect(done).resolves.toEqual(result);
  });

  it("starts with spectators, lets onSpectate refuse, and closes them when the fighters leave", async () => {
    const fighter = fakePlayer();
    const friend = fakePlayer();
    const stranger = fakePlayer({ hooks: { "server-turnBattle-onSpectate": [() => false] } });
    void startTurnBattle({ players: [fighter.player], troop: "duo", spectators: [friend.player], seed: 2 });
    await flush();
    expect(friend.packets[0]?.spectator).toBe(true);
    await expect(watchTurnBattle(stranger.player, fighter.player)).resolves.toBe(false);
    expect(stranger.gui.open).not.toHaveBeenCalled();
    expect(isInTurnBattle(stranger.player)).toBe(false);
    await expect(watchTurnBattle(stranger.player, "no-such-battle")).resolves.toBe(false);

    findHook(provideTurnBattleServer({ ...catalog }), "onDisconnected")(fighter.player);
    expect(friend.gui.close).toHaveBeenCalledWith(null);
    expect(isInTurnBattle(friend.player)).toBe(false);
  });
});

describe("pvp", () => {
  beforeEach(() => {
    provideTurnBattleServer({
      ...catalog,
      hero: (_p, { side }) => ({ battler: side === "ally" ? "knight" : "mage", name: side === "ally" ? "Rain" : "Fina" }),
      party: () => [{ id: "pet", name: "Pet", side: "ally", battler: "pet", stats: stats() }],
    });
  });

  it("puts each player on their side, mirrors the view of the challenged one and ends with opposite results", async () => {
    const a = fakePlayer();
    const b = fakePlayer();
    const onEnd = vi.fn();
    (a.player.hooks as any).callHooks = ((orig) => (name: string, ...args: unknown[]) => {
      if (name === "server-turnBattle-onEnd") onEnd(...args);
      return orig(name, ...args);
    })(a.player.hooks.callHooks);
    const done = startTurnBattle({ players: [a.player], versus: [b.player], background: "volcano", seed: 6 });
    await flush();

    const mine = (p: BattlePacket, id: string) => p.state.combatants.find((c) => c.id === `player:${id}`)!;
    const first = a.packets[0];
    expect(first.state.canEscape).toBe(false);
    expect(first.state.background).toBe("volcano");
    expect(mine(first, a.player.id)).toMatchObject({ side: "ally", battler: "knight", stagger: null });
    expect(mine(first, b.player.id)).toMatchObject({ side: "enemy", battler: "mage", stagger: null, owner: b.player.id });
    // The challenged player sees their own hero on the ally side.
    expect(mine(b.packets[0], b.player.id).side).toBe("ally");
    expect(mine(b.packets[0], a.player.id).side).toBe("enemy");
    // Companions come from `party` (the game decides; here one each).
    expect(first.state.combatants.filter((c) => c.owner === b.player.id)).toHaveLength(2);

    const seat = (id: string) => (id === a.player.id ? a : b);
    for (let i = 0; i < 120 && !last(a.packets).state.result; i++) {
      const s = last(a.packets).state;
      const actor = s.combatants.find((c) => c.id === s.actor)!;
      const foe = s.combatants.find((c) => c.side !== actor.side && c.hp > 0)!;
      await seat(actor.owner!).handlers.command({ revision: s.revision, actor: actor.id, command: { type: "attack", target: foe.id } });
    }
    const ra = last(a.packets).state.result!;
    const rb = last(b.packets).state.result!;
    expect([ra.outcome, rb.outcome].sort()).toEqual(["defeat", "victory"]);
    expect(ra.exp + rb.exp).toBe(0);
    expect(a.player.hp).toBe(300); // PvP leaves HP untouched
    expect(b.player.hp).toBe(300);
    const winner = ra.outcome === "victory" ? a.player.id : b.player.id;
    expect(onEnd).toHaveBeenCalledWith(a.player, expect.anything(), expect.objectContaining({ outcome: ra.outcome, winners: [winner] }));

    await a.handlers.close({});
    await b.handlers.close({});
    expect(b.gui.close).toHaveBeenCalledWith(expect.objectContaining({ outcome: rb.outcome, winners: [winner] }));
    await expect(done).resolves.toMatchObject({ outcome: ra.outcome, winners: [winner] });
  });

  it("gives the victory to the other side when a duelist leaves", async () => {
    const a = fakePlayer();
    const b = fakePlayer();
    const done = startTurnBattle({ players: [a.player], versus: [b.player], seed: 1, turnTimer: false });
    await flush();
    findHook(provideTurnBattleServer({ ...catalog }), "onDisconnected")(b.player);
    const end = last(a.packets);
    expect(end.beats[0]).toMatchObject({ t: "end", result: { outcome: "victory" } });
    await a.handlers.close({});
    await expect(done).resolves.toMatchObject({ outcome: "victory", winners: [a.player.id] });
    expect(b.player.exp).toBe(5);
  });

  it("lets a duelist give up at any time, and a team only once all its players did", async () => {
    const a = fakePlayer();
    const b = fakePlayer();
    const done = startTurnBattle({ players: [a.player], versus: [b.player], seed: 3, turnTimer: false });
    await flush();
    expect(a.packets[0].pvp).toBe(true);
    // Whoever is not acting surrenders: it is not a turn command.
    const s = last(a.packets).state;
    const waiting = s.combatants.find((c) => c.id === s.actor)!.owner === a.player.id ? b : a;
    const other = waiting === a ? b : a;
    await waiting.handlers.surrender({});
    expect(last(other.packets).state.result?.outcome).toBe("victory");
    expect(last(waiting.packets).state.result?.outcome).toBe("defeat");
    await a.handlers.close({});
    await b.handlers.close({});
    await expect(done).resolves.toMatchObject({ winners: [other.player.id] });

    // 2 vs 2: one surrender is only a request; the second one ends it.
    const [c, d, e, f] = [fakePlayer(), fakePlayer(), fakePlayer(), fakePlayer()];
    void startTurnBattle({ players: [c.player, d.player], versus: [e.player, f.player], seed: 3, turnTimer: false });
    await flush();
    await e.handlers.surrender({});
    expect(last(e.packets).error).toBe("turnBattle.surrenderVote");
    expect(last(f.packets).error).toBe("turnBattle.surrenderVote");
    expect(last(c.packets).state.result).toBeNull();
    await f.handlers.surrender({});
    expect(last(c.packets).state.result).toMatchObject({ outcome: "victory" });
  });

  it("ignores a surrender outside PvP", async () => {
    const a = fakePlayer();
    provideTurnBattleServer({ ...catalog, troops: { duo: { id: "duo", enemies: [goblin("g")] } }, hero: () => ({ battler: "knight" }) });
    void startTurnBattle(a.player, "duo", { seed: 1 });
    await flush();
    const before = a.packets.length;
    await a.handlers.surrender({});
    expect(a.packets.length).toBe(before);
    expect(last(a.packets).state.result).toBeNull();
  });

  it("keeps a battle on one map: players and spectators elsewhere are refused", async () => {
    const a = fakePlayer({ map: "map-1" });
    const far = fakePlayer({ map: "map-2" });
    await expect(startTurnBattle({ players: [a.player], versus: [far.player] })).rejects.toThrow(/same map/);
    expect(isInTurnBattle(a.player) || isInTurnBattle(far.player)).toBe(false);
    void startTurnBattle({ players: [a.player], versus: [fakePlayer({ map: "map-1" }).player], seed: 1 });
    await flush();
    await expect(watchTurnBattle(far.player, a.player)).resolves.toBe(false);
    expect(far.gui.open).not.toHaveBeenCalled();
  });

  it("requires a troop or opponents", async () => {
    const a = fakePlayer();
    await expect(startTurnBattle({ players: [a.player] })).rejects.toThrow(/troop or opponents/);
    expect(isInTurnBattle(a.player)).toBe(false);
  });
});

describe("a hero chosen for each player of a group battle", () => {
  beforeEach(() => {
    provideTurnBattleServer({
      ...catalog,
      enemies: { goblin: goblin("x", { stats: stats({ maxHp: 90, atk: 5, agi: 5 }) }) },
      troops: { duo: { id: "duo", enemies: ["goblin"] } },
      hero: () => ({ battler: "knight", name: "Rain" }),
    });
  });

  it("fights with the hero given for the player instead of the one read from the player, the other players keeping theirs", async () => {
    const a = fakePlayer();
    const b = fakePlayer();
    const chosen = { name: "Kael", battler: "record:kael", stats: stats({ maxHp: 777 }), skills: [] };

    void startTurnBattle({ players: [a.player, b.player], troop: "duo", heroesByPlayer: { [a.player.id]: [chosen] }, seed: 3, turnTimer: false });
    await flush();

    const combatants = a.packets[0].state.combatants;
    const mine = combatants.find((c) => c.owner === a.player.id)!;
    const theirs = combatants.find((c) => c.owner === b.player.id)!;
    expect(mine).toMatchObject({ name: "Kael", battler: "record:kael", side: "ally" });
    expect(mine.stats.maxHp).toBe(777);
    expect(theirs).toMatchObject({ name: "Rain", battler: "knight" });
  });
});

describe("custom commands", () => {
  it("sends the menu data, runs the command on the server and gives the stolen item", async () => {
    provideTurnBattleServer({
      ...catalog,
      enemies: { goblin: goblin("x", { stats: stats({ maxHp: 60, atk: 5, agi: 5 }), rewards: { items: [{ id: "phoenix", chance: 0 }] } }) },
      troops: { duo: { id: "duo", enemies: ["goblin"] } },
      hero: () => ({ battler: "knight", commands: ["steal"] }),
      commands: {
        steal: turnBattleCommand({
          label: "Voler",
          icon: "✋",
          scope: "enemy",
          resolve({ target, act }) {
            const loot = act.lootOf(target!);
            if (loot) act.give(loot);
          },
        }),
      },
    });
    const { player, packets, handlers } = fakePlayer();
    void startTurnBattle(player, "duo", { seed: 2 });
    await flush();
    const s = last(packets).state;
    expect(s.catalog.commands?.steal).toMatchObject({ id: "steal", label: "Voler", icon: "✋", scope: "enemy" });
    expect(typeof (s.catalog.commands?.steal as any).resolve).toBe("undefined"); // rules stay on the server
    const enemy = s.combatants.find((c) => c.side === "enemy")!;
    await handlers.command({ revision: s.revision, actor: s.actor, command: { type: "custom", command: "steal", target: enemy.id } });
    expect(last(packets).state.gains).toEqual({ [player.id]: { phoenix: 1 } });
    await playToEnd(packets, handlers);
    expect(player.addItem).toHaveBeenCalledWith("phoenix", 1);
  });
});

describe("triggers of a skill", () => {
  const setup = (runTrigger: (...args: any[]) => unknown) => {
    provideTurnBattleServer({
      ...catalog,
      enemies: { goblin: goblin("x", { stats: stats({ maxHp: 600, atk: 1, agi: 1 }) }) },
      troops: { duo: { id: "duo", enemies: ["goblin"] } },
      hero: () => ({ battler: "knight", commands: ["zap"] }),
      commands: { zap: actionCommand({ name: "Zap", triggers: ["cast", "impact"], effects: [{ type: "damage", power: 100 }] }) },
      runTrigger: runTrigger as any,
    });
  };
  const zap = async () => {
    const { player, packets, handlers } = fakePlayer();
    void startTurnBattle(player, "duo", { seed: 2 });
    await flush();
    const s = last(packets).state;
    const enemy = s.combatants.find((c) => c.side === "enemy")!;
    await handlers.command({ revision: s.revision, actor: s.actor, command: { type: "custom", command: "zap", target: enemy.id } });
    await flush();
    return { player, enemy, packets, handlers };
  };

  it("runs each trigger for the player who used the skill, once, in order", async () => {
    const runTrigger = vi.fn();
    setup(runTrigger);
    const { player, enemy } = await zap();

    expect(runTrigger.mock.calls).toEqual([
      [player, { skill: "zap", phase: "cast", actor: expect.any(String) }],
      [player, { skill: "zap", phase: "impact", actor: expect.any(String), target: enemy.id }],
    ]);
  });

  it("shows in the battle the life and the SP a trigger sets on the player, and keeps them to the end", async () => {
    setup((player: any) => {
      player.hp = 50;
      player.sp = 5;
    });
    const { player, packets } = await zap();

    const hero = last(packets).state.combatants.find((c) => c.owner === player.id)!;
    expect(hero.hp).toBe(50);
    expect(hero.sp).toBe(5);
    expect(last(packets).beats.some((beat) => beat.t === "sync")).toBe(true);
  });

  it("leaves the life of the units alone when the trigger sets nothing", async () => {
    setup(() => undefined);
    const { player, packets } = await zap();

    const hero = last(packets).state.combatants.find((c) => c.owner === player.id)!;
    expect(hero.hp).toBeGreaterThan(250);
    expect(last(packets).beats.some((beat) => beat.t === "sync")).toBe(false);
  });

  it("warns once, and says which skill, when it has triggers and nothing runs them", async () => {
    setup(undefined as never);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { player, packets, handlers } = await zap();
    const s = last(packets).state;
    if (s.actor && !s.result) await handlers.command({ revision: s.revision, actor: s.actor, command: { type: "custom", command: "zap", target: s.combatants.find((c) => c.side === "enemy")!.id } });
    await flush();

    const warnings = warn.mock.calls.map((call) => String(call[0])).filter((text) => text.includes("runTrigger"));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("zap");
    expect(warnings[0]).toMatch(/cast.*impact/);
    expect(player).toBeDefined();
    warn.mockRestore();
  });

  it("does not warn when the skill has a native hook for what it asks, or when the triggers are run", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    setup(vi.fn());
    await zap();

    expect(warn.mock.calls.some((call) => String(call[0]).includes("runTrigger"))).toBe(false);
    warn.mockRestore();
  });

  it("does not stop the battle when a trigger fails", async () => {
    setup(() => {
      throw new Error("no such event");
    });
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { packets } = await zap();

    expect(last(packets).state.result).toBeNull();
    spy.mockRestore();
  });
});

describe("actions of the database", () => {
  const begin = async (database: Record<string, unknown>, extra: Record<string, unknown> = {}, commands = ["steal"]) => {
    provideTurnBattleServer({
      ...catalog,
      enemies: { goblin: goblin("x", { stats: stats({ maxHp: 60, atk: 5, agi: 5 }), rewards: { items: [{ id: "phoenix", chance: 0 }] } }), imp: { name: "Imp", battler: "imp", stats: stats({ maxHp: 90 }), rewards: { exp: 99, gold: 99 } } as never },
      troops: { duo: { id: "duo", enemies: ["goblin"] } },
      hero: () => ({ battler: "knight", commands }),
      ...extra,
    });
    const rig = fakePlayer({ database: database as Record<string, any> });
    void startTurnBattle(rig.player, "duo", { seed: 2 });
    await flush();
    return { ...rig, state: last(rig.packets).state };
  };

  it("are commands of the battle: the record gives the menu and what the server does, without any code", async () => {
    const { player, packets, handlers, state } = await begin({
      steal: { _type: "command", name: "Voler", icon: "hand", scope: "enemy", effects: [{ type: "steal", chance: 100 }] },
    });

    expect(state.catalog.commands?.steal).toMatchObject({ id: "steal", label: "Voler", icon: "hand", scope: "enemy" });
    const enemy = state.combatants.find((c) => c.side === "enemy")!;
    await handlers.command({ revision: state.revision, actor: state.actor, command: { type: "custom", command: "steal", target: enemy.id } });
    expect(last(packets).state.gains).toEqual({ [player.id]: { phoenix: 1 } });
  });

  it("leave an unknown action out, and let the commands of the options win", async () => {
    const { state } = await begin({}, { commands: { steal: turnBattleCommand({ label: "Du code", resolve: () => undefined }) } }, ["steal", "ghost"]);

    expect(Object.keys(state.catalog.commands ?? {})).toEqual(["steal"]);
    expect(state.catalog.commands?.steal?.label).toBe("Du code");
  });

  it("call an enemy of the database as a creature: its battle shape, and what it gives when it falls left out", async () => {
    const { player, packets, handlers, state } = await begin(
      { call: { _type: "command", name: "Invoquer", effects: [{ type: "summon", creatures: [{ id: "imp", enemy: "imp", turns: 4 }] }] } },
      {},
      ["call"],
    );

    expect(state.catalog.summons?.imp).toMatchObject({ name: "Imp", battler: "imp", turns: 4 });
    expect(state.catalog.summons?.imp).not.toHaveProperty("rewards");
    await handlers.command({ revision: state.revision, actor: state.actor, command: { type: "custom", command: "call", target: heroId(player) } });
    const hit = last(packets).beats.flatMap((b) => (b.t === "action" ? b.waves.flat() : [])).find((h) => h.kind === "summon");
    expect(hit?.unit).toMatchObject({ name: "Imp", side: "ally", owner: player.id, summon: { by: heroId(player), turns: 4 } });
  });
});

describe("the native hook of a skill", () => {
  const begin = async (database: Record<string, unknown>, extra: Record<string, unknown> = {}) => {
    provideTurnBattleServer({
      ...catalog,
      enemies: { goblin: goblin("x", { stats: stats({ maxHp: 5000, atk: 1, agi: 1 }) }) },
      troops: { duo: { id: "duo", enemies: ["goblin", "goblin"] } },
      hero: () => ({ battler: "knight", skills: ["bash"] }),
      ...extra,
    });
    const rig = fakePlayer({ database: database as Record<string, any> });
    void startTurnBattle(rig.player, "duo", { seed: 2 });
    await flush();
    const state = last(rig.packets).state;
    return { ...rig, state, enemies: state.combatants.filter((c) => c.side === "enemy") };
  };
  const bash = (over: Record<string, unknown> = {}) => ({ bash: { _type: "skill", name: "Coup", spCost: 0, turnBattle: { scope: "allEnemies" }, ...over } });

  it("is called by the skill record once for each target it reaches, with the player and the target", async () => {
    const onUse = vi.fn();
    const { player, packets, handlers, state, enemies } = await begin(bash({ onUse }));

    await handlers.command({ revision: state.revision, actor: state.actor, command: { type: "skill", skill: "bash" } });
    await flush();

    expect(onUse).toHaveBeenCalledTimes(2);
    expect(onUse).toHaveBeenCalledWith(player, expect.objectContaining({ id: enemies[0]!.id, name: enemies[0]!.name }));
    expect(onUse).toHaveBeenCalledWith(player, expect.objectContaining({ id: enemies[1]!.id }));
    expect(last(packets).state.result).toBeNull();
  });

  it("is not called when the adapted record has none (the Studio runs its own triggers)", async () => {
    const onUse = vi.fn();
    const { handlers, state } = await begin(bash({ onUse }), { adapt: { skill: (raw: any) => ({ ...raw, onUse: undefined }) } });

    await handlers.command({ revision: state.revision, actor: state.actor, command: { type: "skill", skill: "bash" } });
    await flush();

    expect(onUse).not.toHaveBeenCalled();
  });

  it("goes on when the hook fails, and takes the life it sets on the player", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { player, packets, handlers, state } = await begin(bash({ onUse: (p: any) => { p.hp = 40; throw new Error("boom"); } }));

    await handlers.command({ revision: state.revision, actor: state.actor, command: { type: "skill", skill: "bash" } });
    await flush();

    expect(last(packets).state.combatants.find((c) => c.owner === player.id)!.hp).toBe(40);
    spy.mockRestore();
  });
});

describe("skills that do several things", () => {
  const begin = async (database: Record<string, unknown>, skills: string[]) => {
    provideTurnBattleServer({
      ...catalog,
      enemies: { goblin: goblin("x", { stats: stats({ maxHp: 5000, atk: 1, agi: 1 }) }) },
      troops: { duo: { id: "duo", enemies: ["goblin"] } },
      hero: () => ({ battler: "knight", skills }),
    });
    const rig = fakePlayer({ database: database as Record<string, any> });
    void startTurnBattle(rig.player, "duo", { seed: 2 });
    await flush();
    return { ...rig, state: last(rig.packets).state };
  };
  const skill = (battle: Record<string, unknown>, over: Record<string, unknown> = {}) => ({ _type: "skill", name: "Frappe", spCost: 3, ...over, turnBattle: battle });

  it("with effects are commands: listed among the skills, or in the menu when they are pinned", async () => {
    const { state } = await begin(
      {
        strike: skill({ effects: [{ type: "damage", power: 200 }] }),
        steal: skill({ pinned: true, icon: "✋", effects: [{ type: "steal" }] }, { name: "Voler", spCost: 0 }),
      },
      ["strike", "steal"],
    );
    const me = state.combatants.find((c) => c.side === "ally")!;

    expect(state.catalog.commands?.strike).toMatchObject({ label: "Frappe", spCost: 3, inSkills: true });
    expect(state.catalog.commands?.steal).toMatchObject({ label: "Voler", icon: "✋" });
    expect(state.catalog.commands?.steal?.inSkills).toBeUndefined();
    // They are no skills of the catalog: the unit has them as commands
    expect(Object.keys(state.catalog.skills)).not.toContain("strike");
    expect(me.commands).toEqual(["strike", "steal"]);
    expect(me.skills).not.toContain("strike");
  });

  it("play the effects and the sounds the skill chose, on the beat of their action", async () => {
    const { packets, handlers, state } = await begin(
      { strike: skill({ effects: [{ type: "damage", power: 100 }], castFx: "chargeUp", castSound: "cast-id", impactSound: "hit-id", impactAnimation: "sheet-id", fx: "explosionSmall" }) },
      ["strike"],
    );
    const enemy = state.combatants.find((c) => c.side === "enemy")!;

    await handlers.command({ revision: state.revision, actor: state.actor, command: { type: "custom", command: "strike", target: enemy.id } });

    const action = last(packets).beats.find((b) => b.t === "action") as any;
    expect(action).toMatchObject({ castFx: "chargeUp", castSound: "cast-id", impactSound: "hit-id", impactAnimation: "sheet-id", fx: "explosionSmall" });
  });

  it("play the Visual Effect of the skill on the beat of their action, without sending it with the menu", async () => {
    const effect = { base: "fireball", duration: 900, hitAt: 500 };
    const { packets, handlers, state } = await begin({ strike: skill({ effects: [{ type: "damage", power: 100 }], effect }) }, ["strike"]);
    const enemy = state.combatants.find((c) => c.side === "enemy")!;

    expect(state.catalog.commands?.strike).not.toHaveProperty("effect");
    await handlers.command({ revision: state.revision, actor: state.actor, command: { type: "custom", command: "strike", target: enemy.id } });

    const action = last(packets).beats.find((b) => b.t === "action") as any;
    expect(action.effect).toEqual(effect);
  });

  it("run their effects when they are used, and cost their SP", async () => {
    const { player, packets, handlers, state } = await begin({ strike: skill({ effects: [{ type: "damage", power: 200 }] }) }, ["strike"]);
    const enemy = state.combatants.find((c) => c.side === "enemy")!;
    const sp = state.combatants.find((c) => c.side === "ally")!.sp;

    await handlers.command({ revision: state.revision, actor: state.actor, command: { type: "custom", command: "strike", target: enemy.id } });

    const hit = last(packets).beats.flatMap((b) => (b.t === "action" ? b.waves.flat() : [])).find((h) => h.kind === "damage");
    expect(hit?.target).toBe(enemy.id);
    expect(last(packets).state.combatants.find((c) => c.id === heroId(player))!.sp).toBe(sp - 3);
  });

  it("with only a recharge hit like the skill says: its power, its kind and its element", async () => {
    const { state } = await begin({ burst: skill({ cooldown: 3, kind: "magical", scope: "allEnemies", hits: 2 }, { power: 120, element: "fire" }) }, ["burst"]);

    expect(state.catalog.commands?.burst).toMatchObject({ cooldown: 3, scope: "allEnemies", element: "fire" });
    expect(state.catalog.skills.burst).toBeUndefined();
  });

  it("stay skills when they only have the fields of a skill", async () => {
    const { state } = await begin({ plain: skill({ kind: "magical" }) }, ["plain"]);
    const me = state.combatants.find((c) => c.side === "ally")!;

    expect(state.catalog.skills.plain).toBeDefined();
    expect(state.catalog.commands?.plain).toBeUndefined();
    expect(me.skills).toContain("plain");
  });

  it("carry how an enemy AI uses them", async () => {
    const { state } = await begin({ rage: skill({ ai: { weight: 3, hpBelow: 40 }, effects: [{ type: "damage" }] }) }, ["rage"]);

    expect(state.catalog.commands?.rage?.ai).toEqual({ weight: 3, hpBelow: 40 });
  });
});

describe("the creatures of an action", () => {
  it("are named in the sub-menu by their enemy when the action gives no name", async () => {
    provideTurnBattleServer({
      ...catalog,
      enemies: {
        goblin: goblin("x", { stats: stats({ maxHp: 60, atk: 5, agi: 5 }) }),
        imp: { name: "Imp", battler: "imp", stats: stats() } as never,
        ogre: { name: "Ogre", battler: "ogre", stats: stats() } as never,
      },
      troops: { duo: { id: "duo", enemies: ["goblin"] } },
      hero: () => ({ battler: "knight", commands: ["call"] }),
    });
    const database = {
      call: {
        _type: "command",
        name: "Invoquer",
        effects: [{ type: "summon", creatures: [{ id: "imp", enemy: "imp" }, { id: "ogre", enemy: "ogre", label: "Gros" }] }],
      },
    };
    const { player, packets } = fakePlayer({ database });
    void startTurnBattle(player, "duo", { seed: 2 });
    await flush();

    expect(last(packets).state.catalog.commands?.call?.options).toEqual([
      { id: "imp", label: "Imp" },
      { id: "ogre", label: "Gros" },
    ]);
  });
});

describe("summons", () => {
  it("finds summons of command options in the RPGJS database, with their skills", async () => {
    const database = {
      firebird: { _type: "summon", name: "Oiseau de feu", turnBattle: { battler: "firebird", stats: stats(), skills: ["fire"], turns: 2 } },
    };
    provideTurnBattleServer({
      ...catalog,
      enemies: { goblin: goblin("x") },
      troops: { duo: { id: "duo", enemies: ["goblin"] } },
      hero: () => ({ battler: "knight", commands: ["summon"], skills: [] }),
      commands: {
        summon: turnBattleCommand({
          label: "Invoquer",
          scope: "self",
          options: [{ id: "firebird", label: "Oiseau de feu" }],
          resolve: ({ option, act }) => void act.summon(option!),
        }),
      },
    });
    const { player, packets, handlers } = fakePlayer({ database });
    void startTurnBattle(player, "duo", { seed: 3 });
    await flush();
    const s = last(packets).state;
    expect(s.catalog.summons?.firebird).toMatchObject({ name: "Oiseau de feu", battler: "firebird", turns: 2 });
    expect(s.catalog.skills.fire).toBeDefined();
    expect(s.catalog.commands?.summon.options).toEqual([{ id: "firebird", label: "Oiseau de feu" }]);
    await handlers.command({ revision: s.revision, actor: s.actor, command: { type: "custom", command: "summon", option: "firebird" } });
    const hit = last(packets).beats.flatMap((b) => (b.t === "action" ? b.waves.flat() : [])).find((h) => h.kind === "summon");
    expect(hit?.unit).toMatchObject({ name: "Oiseau de feu", owner: player.id, side: "ally" });
  });
});

describe("limit gauges", () => {
  it("are read and written with getLimit / setLimit and used by the next battle", async () => {
    provideTurnBattleServer({
      ...catalog,
      enemies: { goblin: goblin("x", { stats: stats({ maxHp: 60, atk: 5, agi: 5 }) }) },
      troops: { duo: { id: "duo", enemies: ["goblin"] } },
      hero: () => ({ battler: "knight", limit: { skill: "burst" } }),
      party: (p) => [{ id: `pet:${p.id}`, name: "Pet", side: "ally", battler: "pet", stats: stats(), limit: { skill: "burst" } }],
    });
    const { player, packets, handlers } = fakePlayer();
    expect(getLimit(player)).toBe(0);
    setLimit(player, 100);
    setLimit(player, 40, `pet:${player.id}`);
    expect(getLimits(player)).toEqual({ [heroId(player)]: 100, [`pet:${player.id}`]: 40 });

    void startTurnBattle(player, "duo", { seed: 2 });
    await flush();
    const units = packets[0].state.combatants;
    expect(units.find((c) => c.id === heroId(player))!.limit!.value).toBe(100);
    expect(units.find((c) => c.id === `pet:${player.id}`)!.limit!.value).toBe(40);

    await playToEnd(packets, handlers);
    // Gauges are saved back after the battle (they only grow while fighting).
    expect(getLimit(player, `pet:${player.id}`)).toBeGreaterThanOrEqual(40);
    await handlers.close({});

    clearLimits(player);
    expect(getLimits(player)).toEqual({});
    setLimit(player, -5, "hero");
    expect(getLimit(player, "hero")).toBe(0);
  });
});

/** Player hooks declared by the plugin module (createModule → server definition). */
function findHook(provider: unknown, name: string): (...a: any[]) => any {
  const seen = new Set<unknown>();
  const visit = (v: any): any => {
    if (!v || typeof v !== "object" || seen.has(v)) return undefined;
    seen.add(v);
    if (typeof v.player?.[name] === "function") return v.player[name];
    for (const k of Object.keys(v)) {
      const found = visit(v[k]);
      if (found) return found;
    }
    return undefined;
  };
  const fn = visit(provider);
  if (!fn) throw new Error(`hook ${name} not found`);
  return fn;
}
