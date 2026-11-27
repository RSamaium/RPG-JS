import { describe, it, expect, vi, afterEach } from "vitest";
vi.mock("@rpgjs/server", () => ({ defineModule: (value: unknown) => value }));
vi.mock("@rpgjs/common", () => ({ createModule: (_name: string, value: unknown) => value }));
import { provideTacticalServer, startTacticalBattle, stopTacticalBattle, getTacticalBattle } from "../server";
import { createTacticalBattle, transition, type BattlePacket } from "../core";
import { emberDatabase } from "./demo-database";

const db = emberDatabase as Record<string, any>;
const pick = (type: string) => Object.fromEntries(Object.entries(db).filter(([, r]) => r._type === type));
const map = {};

describe("PvP rules", () => {
  it("gives the enemies to the versus side; a side can surrender at any time", () => {
    let state = createTacticalBattle(
      { data: db.sanctuary.tactical, units: pick("tactical-unit") as never, skills: pick("skill") as never },
      { id: "d", players: [{ id: "a", name: "Alice" }], versus: [{ id: "b", name: "Bob" }] },
    );
    expect(state.units.filter((u) => u.team === "enemy").every((u) => u.owner === "b")).toBe(true);
    expect(() => transition(state, { type: "surrender" }, "enemy")).toThrow("tactical.error.turn");
    state = transition(state, { type: "start" }, "ally").state;
    const out = transition(state, { type: "surrender" }, "enemy", [], "b");
    expect(out.state.winner).toBe("ally");
    expect(out.event).toMatchObject({ kind: "surrender", team: "enemy" });
  });
});

function fake(name: string) {
  const packets: BattlePacket[] = [];
  const listeners = new Map<string, (data?: any) => void>();
  let resolveOpen: (value: unknown) => void = () => {};
  const gui = {
    open: vi.fn((data: BattlePacket) => (packets.push(data), new Promise((resolve) => (resolveOpen = resolve)))),
    update: (data: BattlePacket) => packets.push(data),
    on: (event: string, cb: (data?: any) => void) => listeners.set(event, cb),
    close: vi.fn((result: unknown) => resolveOpen(result)),
  };
  const player = { id: `${name}${Math.random()}`, name, x: 0, y: 0, graphics: ["hero"], setGraphic: vi.fn(), gui: () => gui, getCurrentMap: () => map } as any;
  const state = () => packets.at(-1)!.state;
  const command = async (value: unknown) => {
    listeners.get("command")!({ revision: state().revision, command: value });
    await vi.advanceTimersByTimeAsync(0);
  };
  return { player, gui, packets, listeners, state, command };
}
function duel() {
  vi.useFakeTimers();
  provideTacticalServer({ units: pick("tactical-unit"), skills: pick("skill"), encounters: pick("tactical-encounter") });
  const alice = fake("Alice");
  const bob = fake("Bob");
  const done = startTacticalBattle({ players: [alice.player], versus: [bob.player], encounter: "sanctuary" });
  return { alice, bob, done };
}
afterEach(() => vi.useRealTimers());

describe("PvP session", () => {
  it("names two guests' heroes like the list of the players: Player 1 and Player 2", async () => {
    vi.useFakeTimers();
    provideTacticalServer({ units: pick("tactical-unit"), skills: pick("skill") });
    const a = fake("");
    const b = fake("");
    void startTacticalBattle({
      players: [a.player],
      versus: [b.player],
      encounter: { name: "Arena", tactical: { allies: [{ hero: true, x: 4, y: 6 }], enemies: [{ hero: true, x: 4, y: 0 }] } } as never,
    });
    await vi.advanceTimersByTimeAsync(0);
    const state = a.state();
    expect([...state.players, ...state.versus].map((p) => p.name)).toEqual(["Player 1", "Player 2"]);
    const hero = (player: { id: string }) => state.units.find((u) => u.player === player.id)!.name;
    expect([hero(a.player), hero(b.player)]).toEqual(["Player 1", "Player 2"]);
  });

  it("each side plays its own units and phase; no AI", async () => {
    const { alice, bob } = duel();
    await vi.advanceTimersByTimeAsync(0);
    expect(getTacticalBattle(bob.player)?.versus).toEqual([bob.player]);
    await alice.command({ type: "start" });
    await bob.command({ type: "start" });
    expect(alice.state().started).toBe(true);
    await vi.advanceTimersByTimeAsync(1500);
    await bob.command({ type: "endPhase" });
    expect(bob.packets.at(-1)?.error).toBe("tactical.error.turn");
    await alice.command({ type: "endPhase" });
    expect(bob.state().phase).toBe("enemy");
    // No AI: nothing happens until Bob plays.
    const revision = bob.state().revision;
    await vi.advanceTimersByTimeAsync(10000);
    expect(bob.state().revision).toBe(revision);
    const cendre = bob.state().units.find((u) => u.team === "enemy")!;
    await bob.command({ type: "wait", unitId: cendre.id });
    expect(alice.state().units.find((u) => u.id === cendre.id)!.acted).toBe(true);
    // Alice's order waits for the running animation, then the rules refuse it.
    await alice.command({ type: "wait", unitId: cendre.id });
    await vi.advanceTimersByTimeAsync(1500);
    expect(alice.packets.at(-1)?.error).toBe("tactical.error.turn");
  });
  it("surrender: a result per side, the winners listed", async () => {
    const { alice, bob, done } = duel();
    await vi.advanceTimersByTimeAsync(0);
    await alice.command({ type: "start" });
    await bob.command({ type: "start" });
    await vi.advanceTimersByTimeAsync(1500);
    await bob.command({ type: "surrender" });
    expect(alice.state().winner).toBe("ally");
    alice.listeners.get("close")!();
    bob.listeners.get("close")!();
    expect(alice.gui.close).toHaveBeenCalledWith(expect.objectContaining({ outcome: "victory", winners: [alice.player.id] }));
    expect(bob.gui.close).toHaveBeenCalledWith(expect.objectContaining({ outcome: "defeat", winners: [alice.player.id] }));
    expect((await done).outcome).toBe("victory");
  });
  it("a side left without players loses by forfeit, even before the start", async () => {
    const { alice, bob, done } = duel();
    await vi.advanceTimersByTimeAsync(0);
    await stopTacticalBattle(alice.player);
    expect(bob.state().winner).toBe("enemy");
    expect(bob.state().started).toBe(true);
    expect(bob.packets.at(-1)?.event).toMatchObject({ kind: "surrender", team: "ally" });
    bob.listeners.get("close")!();
    expect(bob.gui.close).toHaveBeenCalledWith(expect.objectContaining({ outcome: "victory" }));
    await done;
  });
});
