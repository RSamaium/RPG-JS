import { describe, it, expect, vi, afterEach } from "vitest";
vi.mock("@rpgjs/server", () => ({ defineModule: (value: unknown) => value }));
vi.mock("@rpgjs/common", () => ({ createModule: (_name: string, value: unknown) => value }));
import { provideTacticalServer, startTactical } from "../server";
import { createTacticalBattle, eventDuration, hold, reachable, transition, type BattlePacket, type BattleState, type TacticalSkillRecord, type TacticalUnitRecord } from "../core";
import { emberDatabase } from "../demo/database";

const db = emberDatabase as Record<string, any>;
const pick = (type: string) => Object.fromEntries(Object.entries(db).filter(([, r]) => r._type === type));

function coopState(): BattleState {
  const state = createTacticalBattle(
    { data: db.sanctuary.battle, units: pick("tactical-unit") as Record<string, TacticalUnitRecord>, skills: pick("tactical-skill") as Record<string, TacticalSkillRecord> },
    { id: "c", players: [{ id: "a", name: "Alice" }, { id: "b", name: "Bob" }] },
  );
  return transition(state, { type: "start" }, "ally").state;
}
/** A unit of each player and a cell both can walk to. */
function sharedCell(state: BattleState) {
  const alice = state.units.find((u) => u.owner === "a")!;
  const bob = state.units.find((u) => u.owner === "b")!;
  const forBob = reachable(state, bob);
  const cell = [...reachable(state, alice).entries()].find(([k, path]) => path.length && forBob.get(k)?.length)![1].at(-1)!;
  return { alice, bob, cell };
}

describe("a cell held for the move a player prepares", () => {
  it("is no longer offered to the units of the others, and a move to it is refused", () => {
    const state = coopState();
    const { alice, bob, cell } = sharedCell(state);
    const held = hold(state, alice.id, cell, "ally", "a");

    expect(held.holds).toEqual([{ unitId: alice.id, x: cell.x, y: cell.y, owner: "a" }]);
    expect(reachable(held, bob).has(`${cell.x},${cell.y}`)).toBe(false);
    expect(reachable(held, alice).has(`${cell.x},${cell.y}`)).toBe(true);
    expect(() => transition(held, { type: "move", unitId: bob.id, cell }, "ally", [], "b")).toThrow("t.error.held");
    expect(() => hold(held, bob.id, cell, "ally", "b")).toThrow("t.error.held");
  });
  it("is free again when the player lets it go, when the unit acts and when the phase ends", () => {
    const state = coopState();
    const { alice, bob, cell } = sharedCell(state);
    const held = hold(state, alice.id, cell, "ally", "a");

    expect(hold(held, alice.id, null, "ally", "a").holds).toEqual([]);
    expect(transition(held, { type: "move", unitId: alice.id, cell }, "ally", [], "a").state.holds).toEqual([]);
    expect(transition(held, { type: "wait", unitId: alice.id }, "ally", [], "a").state.holds).toEqual([]);
    let over = transition(held, { type: "endPhase" }, "ally", [], "b").state;
    expect(over.holds).toHaveLength(1);
    over = transition(held, { type: "endPhase" }, "ally").state;
    expect(over.phase).toBe("enemy");
    expect(over.holds).toBeUndefined();
    expect(bob.id).not.toBe(alice.id);
  });
  it("is refused on the unit of a partner and outside the reach of the unit", () => {
    const state = coopState();
    const { alice } = sharedCell(state);
    expect(() => hold(state, alice.id, { x: alice.x, y: alice.y }, "ally", "a")).toThrow("t.error.move");
    expect(() => hold(state, alice.id, { x: 0, y: 0 }, "ally", "b")).toThrow("t.error.owner");
  });
});

describe("how long an event plays", () => {
  it("follows the Visual Effect of the skill, so the server waits for it", () => {
    const state = coopState();
    const unit = state.units.find((u) => u.skillIds.length)!;
    const skillId = unit.skillIds[0];
    expect(eventDuration(state, { kind: "move", unitId: unit.id })).toBe(900);
    expect(eventDuration(state, { kind: "attack", unitId: unit.id })).toBe(1500);
    expect(eventDuration(state, { kind: "phase" })).toBe(0);
    const long = { ...state, skills: { ...state.skills, [skillId]: { ...state.skills[skillId], effect: { hitAt: 2000, duration: 4000 } as never } } };
    expect(eventDuration(long, { kind: "skill", unitId: unit.id, skillId })).toBeGreaterThanOrEqual(4000);
  });
});

/** Two fake players on the same map, each with a GUI recording packets: partners, or the two sides of a duel. */
function session(o: { duel?: boolean; turnSeconds?: number } = {}) {
  vi.useFakeTimers();
  provideTacticalServer({ units: pick("tactical-unit"), skills: pick("tactical-skill"), encounters: pick("tactical-encounter"), ...(o.turnSeconds !== undefined ? { turnSeconds: o.turnSeconds } : {}) });
  const map = {};
  const make = (id: string, name: string) => {
    const packets: BattlePacket[] = [];
    const listeners = new Map<string, (data?: any) => void>();
    let resolveOpen: (value: unknown) => void = () => {};
    const gui = {
      open: vi.fn((data: BattlePacket) => (packets.push(data), new Promise((resolve) => (resolveOpen = resolve)))),
      update: (data: BattlePacket) => packets.push(data),
      on: (event: string, cb: (data?: any) => void) => listeners.set(event, cb),
      close: vi.fn((result: unknown) => resolveOpen(result)),
    };
    const player = { id, name, x: 0, y: 0, graphics: ["hero"], setGraphic: vi.fn(), gui: () => gui, getCurrentMap: () => map };
    const state = () => packets.at(-1)!.state;
    const emit = async (event: string, value: unknown) => {
      listeners.get(event)!(value);
      await vi.advanceTimersByTimeAsync(0);
    };
    const command = (value: unknown) => emit("command", { revision: state().revision, command: value });
    return { id, player, gui, packets, state, command, emit };
  };
  const a = make(`a${Math.random()}`, "Alice");
  const b = make(`b${Math.random()}`, "Bob");
  void startTactical({ players: [a.player as never], ...(o.duel ? { versus: [b.player as never] } : {}), ...(o.duel ? {} : { players: [a.player as never, b.player as never] }), encounter: "sanctuary" });
  const begin = async () => {
    await vi.advanceTimersByTimeAsync(0);
    await a.command({ type: "start" });
    await b.command({ type: "start" });
  };
  return { a, b, begin };
}
afterEach(() => vi.useRealTimers());

describe("the time of a phase", () => {
  it("is told to the players, and what was not played waits when it runs out", async () => {
    const { a, b, begin } = session({ duel: true, turnSeconds: 30 });
    await begin();
    // The time starts once the opening is played
    expect(a.state().timer).toEqual({ seconds: 30, left: 31200 });
    expect(a.state().phase).toBe("ally");

    await vi.advanceTimersByTimeAsync(31000);
    expect(a.state().phase).toBe("ally");
    await vi.advanceTimersByTimeAsync(500);

    expect(b.state().phase).toBe("enemy");
    expect(b.packets.at(-1)?.event).toMatchObject({ kind: "phase", timeout: true });
    // The other side has its own time, from the start
    expect(b.state().timer?.left).toBeGreaterThan(29000);
    await vi.advanceTimersByTimeAsync(31000);
    expect(a.state().phase).toBe("ally");
    expect(a.state().round).toBe(2);
  });
  it("does not run while an action plays", async () => {
    const { a, begin } = session({ duel: true, turnSeconds: 30 });
    await begin();
    const unit = a.state().units.find((u) => u.team === "ally")!;
    await vi.advanceTimersByTimeAsync(10000);
    await a.command({ type: "guard", unitId: unit.id });
    // 20 s were left, plus the time the action plays
    expect(a.state().timer!.left).toBeGreaterThan(20000);
  });
  it("is 60 seconds by default with several players, and none in a battle played alone or when it is set to 0", async () => {
    const coop = session();
    await coop.begin();
    expect(coop.a.state().timer?.seconds).toBe(60);
    vi.useRealTimers();

    const free = session({ turnSeconds: 0 });
    await free.begin();
    expect(free.a.state().timer).toBeUndefined();
    await vi.advanceTimersByTimeAsync(600000);
    expect(free.a.state().phase).toBe("ally");
  });
  it("is not counted during the phase the AI plays", async () => {
    const { a, b, begin } = session({ turnSeconds: 30 });
    await begin();
    await a.command({ type: "endPhase" });
    await b.command({ type: "endPhase" });
    // The order of a partner waits for the action being played
    await vi.advanceTimersByTimeAsync(2600);
    expect(a.state().phase).toBe("enemy");
    expect(a.state().timer).toBeUndefined();
  });
});

describe("a cell held during a co-op battle", () => {
  it("is shown to the partner, who is refused the same cell", async () => {
    const { a, b, begin } = session();
    await begin();
    const state = a.state();
    const alice = state.units.find((u) => u.owner === a.id)!;
    const bob = state.units.find((u) => u.owner === b.id)!;
    const forBob = reachable(state, bob);
    const cell = [...reachable(state, alice).entries()].find(([k, path]) => path.length && forBob.get(k)?.length)![1].at(-1)!;

    await a.emit("hold", { unitId: alice.id, cell });
    expect(b.state().holds).toEqual([{ unitId: alice.id, x: cell.x, y: cell.y, owner: a.id }]);

    await b.emit("hold", { unitId: bob.id, cell });
    expect(b.packets.at(-1)?.error).toBe("t.error.held");
    expect(a.packets.at(-1)?.error).toBeUndefined();

    await a.emit("hold", { unitId: alice.id, cell: null });
    expect(b.state().holds).toEqual([]);
  });
});

describe("the speed of a duel", () => {
  it("is the one of each player, not shared", async () => {
    const { a, b, begin } = session({ duel: true });
    await begin();
    await a.emit("pace", { pace: 2 });
    expect(a.state().pace).toBe(2);
    expect(b.state().pace).toBe(1);
    // It stays theirs in what follows
    const unit = a.state().units.find((u) => u.team === "ally")!;
    await a.command({ type: "guard", unitId: unit.id });
    expect(a.state().pace).toBe(2);
    expect(b.state().pace).toBe(1);
  });
  it("is shared between partners", async () => {
    const { a, b, begin } = session();
    await begin();
    await a.emit("pace", { pace: 2 });
    expect(b.state().pace).toBe(2);
  });
});
