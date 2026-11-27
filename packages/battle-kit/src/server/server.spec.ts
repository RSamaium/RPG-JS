import { describe, expect, it } from "vitest";
import type { RpgPlayer } from "@rpgjs/server";
import { BattleServerHooks, BattleSessions, battleParticipants, battlePlayerName, databaseRecord, isBattleGroup, type BattleHandleBase, type BattleSession } from "../server";

function fakePlayer(id: string, o: { map?: string; name?: string; hooks?: Record<string, Function[]>; db?: Record<string, unknown> } = {}): RpgPlayer {
  const hooks = o.hooks ?? {};
  return {
    id,
    name: o.name,
    getCurrentMap: () => (o.map === undefined ? undefined : { id: o.map }),
    databaseById: (key: string) => {
      if (!o.db?.[key]) throw new Error("not found");
      return o.db[key];
    },
    hooks: {
      getHookFunctions: (hookId: string) => hooks[hookId] ?? [],
      callHooks: (hookId: string, ...args: unknown[]) => ({
        subscribe(o: { next(v: unknown): void; complete(): void }) {
          o.next((hooks[hookId] ?? []).map((fn) => fn(...args)));
          o.complete();
        },
      }),
    },
  } as unknown as RpgPlayer;
}

function fakeSession(id: string, fighters: RpgPlayer[]): BattleSession & { left: string[]; watched: string[] } {
  const left: string[] = [];
  const watched: string[] = [];
  const handle: BattleHandleBase = { id, player: fighters[0], players: fighters, versus: [], spectators: () => [] };
  return {
    handle,
    left,
    watched,
    plays: (p) => fighters.some((f) => f.id === p.id) && !left.includes(p.id),
    leave: (p) => void left.push(p.id),
    watch: async (s) => (watched.push(s.id), true),
    closed: async () => {},
  };
}

describe("battle sessions (server)", () => {
  it("takes out a player who disconnected while their battle was being prepared", () => {
    const sessions = new BattleSessions("Test");
    const alice = fakePlayer("alice");
    const bob = fakePlayer("bob");
    const release = sessions.reserve([alice, bob]);
    // An `onStart` hook is awaited: Bob disconnects meanwhile.
    sessions.disconnect(bob);
    const session = fakeSession("b1", [alice, bob]);
    sessions.open(session, [alice, bob]);
    release();
    expect(session.left).toEqual(["bob"]);
    expect(sessions.isIn(bob)).toBe(false);
    expect(sessions.isIn(alice)).toBe(true);
    // A later battle of Bob is not taken out.
    sessions.release(alice, session);
    const again = sessions.reserve([bob]);
    const next = fakeSession("b2", [bob]);
    sessions.open(next, [bob]);
    again();
    expect(next.left).toEqual([]);
    expect(sessions.isIn(bob)).toBe(true);
  });

  it("keeps a player who disconnected during the preparation out of another battle until the first one opens", () => {
    const sessions = new BattleSessions("Test");
    const bob = fakePlayer("bob");
    const release = sessions.reserve([bob]);
    sessions.disconnect(bob);
    // Bob reconnects and something tries to start another battle with him: refused while the first one is prepared.
    expect(() => sessions.reserve([bob])).toThrow(/already in a battle/);
    const session = fakeSession("b1", [bob]);
    sessions.open(session, [bob]);
    expect(session.left).toEqual(["bob"]);
    // Once it opened without him, he is free.
    expect(sessions.isIn(bob)).toBe(false);
    release();
    expect(() => sessions.reserve([bob])).not.toThrow();
  });

  it("frees a player who disconnected during a preparation that fails", () => {
    const sessions = new BattleSessions("Test");
    const bob = fakePlayer("bob");
    const release = sessions.reserve([bob]);
    sessions.disconnect(bob);
    release();
    expect(sessions.isIn(bob)).toBe(false);
  });

  it("reserves the players of a battle and refuses a second one", () => {
    const sessions = new BattleSessions("Test");
    const alice = fakePlayer("alice");
    const release = sessions.reserve([alice]);
    expect(sessions.isIn(alice)).toBe(true);
    expect(() => sessions.reserve([alice])).toThrow("[Test] Player alice is already in a battle");
    release();
    expect(sessions.isIn(alice)).toBe(false);
  });

  it("routes a fighter, a battle id, spectators and disconnections to the session", async () => {
    const sessions = new BattleSessions("Test");
    const alice = fakePlayer("alice");
    const bob = fakePlayer("bob");
    const release = sessions.reserve([alice]);
    const session = fakeSession("b1", [alice]);
    sessions.open(session, [alice]);
    release();

    expect(sessions.get(alice)).toBe(session.handle);
    expect(sessions.get("b1")).toBe(session.handle);
    expect(await sessions.watch(bob, alice)).toBe(true);
    expect(session.watched).toEqual(["bob"]);
    expect(sessions.seat(bob, session)).toBe(true);
    expect(sessions.get(bob)).toBeUndefined(); // a spectator does not fight

    sessions.disconnect(alice);
    expect(session.left).toEqual(["alice"]);
    expect(sessions.isIn(alice)).toBe(false);
    sessions.close(session);
    expect(sessions.get("b1")).toBeUndefined();
  });
});

describe("battle participants (server)", () => {
  it("removes duplicates, keeps a player on one side and checks the map", () => {
    const a = fakePlayer("a", { map: "m1" });
    const b = fakePlayer("b", { map: "m1" });
    const c = fakePlayer("c", { map: "m2" });
    const group = { players: [a, a, b], versus: [b], spectators: [c, a] };
    expect(isBattleGroup(group)).toBe(true);
    expect(isBattleGroup(a)).toBe(false);
    const out = battleParticipants("Test", { ...group, spectators: [c, a] });
    expect(out.players.map((p) => p.id)).toEqual(["a", "b"]);
    expect(out.versus).toEqual([]);
    expect(out.spectators.map((p) => p.id)).toEqual(["c"]);
    expect(() => battleParticipants("Test", { players: [a, c] })).toThrow("[Test] Player c is not on the same map as a");
    expect(() => battleParticipants("Test", { players: [] })).toThrow("[Test] No player");
  });

  it("keeps a disconnected player out (MMORPG: their session waits on the map for a reconnection)", () => {
    const leader = fakePlayer("a", { map: "m1" });
    const gone = Object.assign(fakePlayer("g", { map: "m1" }), { isConnected: () => false }) as RpgPlayer;
    const here = Object.assign(fakePlayer("h", { map: "m1" }), { isConnected: () => true }) as RpgPlayer;
    expect(() => battleParticipants("Test", { players: [leader, gone] })).toThrow("[Test] Player g is disconnected");
    expect(() => battleParticipants("Test", { players: [leader], versus: [gone] })).toThrow("[Test] Player g is disconnected");
    expect(battleParticipants("Test", { players: [leader, here], spectators: [gone] }).spectators).toEqual([]);
  });

  it("names a guest without their id", () => {
    expect(battlePlayerName(fakePlayer("x", { name: "Kael" }), "Guest 1")).toBe("Kael");
    expect(battlePlayerName(fakePlayer("x"), "Guest 2")).toBe("Guest 2");
  });

  it("reads a database record, a decorated class included", () => {
    class Fire {}
    Object.assign(Fire.prototype, { options: { name: "Fire", spCost: 10 } });
    const player = fakePlayer("p", { db: { potion: { name: "Potion" }, fire: Fire } });
    expect(databaseRecord(player, "potion")).toEqual({ name: "Potion" });
    expect(databaseRecord(player, "fire")).toMatchObject({ name: "Fire", spCost: 10 });
    expect(databaseRecord(player, "nothing")).toBeUndefined();
  });
});

describe("battle hooks (server)", () => {
  interface Hooks {
    onCommand?(cmd: string): boolean | void;
    onDamage?(n: number): number;
  }

  it("calls the option first, then the game modules under the key of the system", async () => {
    const player = fakePlayer("p", {
      hooks: { "server-myBattle-onCommand": [(cmd: string) => cmd !== "flee"], "server-myBattle-onDamage": [(n: number) => n * 2] },
    });
    const calls: string[] = [];
    const hooks = new BattleServerHooks<Hooks>("myBattle", { onCommand: (cmd) => void calls.push(cmd) });

    expect(await hooks.vetoed(player, "onCommand", "attack")).toBe(false);
    expect(await hooks.vetoed(player, "onCommand", "flee")).toBe(true);
    expect(calls).toEqual(["attack", "flee"]);
    expect(hooks.functions(player, "onDamage").map((fn) => fn(3))).toEqual([6]);
  });
});
