import { describe, it, expect, vi, afterEach } from "vitest";
vi.mock("@rpgjs/server", () => ({ defineModule: (value: unknown) => value }));
vi.mock("@rpgjs/common", () => ({ createModule: (_name: string, value: unknown) => value }));
import { provideTacticalServer, startTactical, stopTactical, isInTactical } from "../server";
import { createTacticalBattle, transition, type BattlePacket, type TacticalSkillRecord, type TacticalUnitRecord } from "../core";
import { emberDatabase } from "../demo/database";

const db = emberDatabase as Record<string, any>;
const pick = (type: string) => Object.fromEntries(Object.entries(db).filter(([, r]) => r._type === type));

function coopState() {
  return createTacticalBattle(
    {
      data: db.sanctuary.battle,
      units: pick("tactical-unit") as Record<string, TacticalUnitRecord>,
      skills: pick("tactical-skill") as Record<string, TacticalSkillRecord>,
    },
    { id: "c", players: [{ id: "a", name: "Alice" }, { id: "b", name: "Bob" }] },
  );
}

describe("coop rules", () => {
  it("deals the allies in turn and lets each player command only their own", () => {
    const state = transition(coopState(), { type: "start" }, "ally").state;
    expect(state.units.filter((u) => u.team === "ally").map((u) => u.owner)).toEqual(["a", "b", "a"]);
    expect(() => transition(state, { type: "wait", unitId: "ally-eryn-1" }, "ally", [], "a")).toThrow("t.error.owner");
    expect(transition(state, { type: "wait", unitId: "ally-eryn-1" }, "ally", [], "b").state.units[1].acted).toBe(true);
  });
  it("ends only the player's own units; the phase passes when every ally has acted", () => {
    let state = transition(coopState(), { type: "start" }, "ally").state;
    state = transition(state, { type: "endPhase" }, "ally", [], "a").state;
    expect(state.phase).toBe("ally");
    expect(state.units.filter((u) => u.owner === "a").every((u) => u.acted)).toBe(true);
    state = transition(state, { type: "endPhase" }, "ally", [], "b").state;
    expect(state.phase).toBe("enemy");
  });
  it("honours an explicit seat", () => {
    const data = { ...db.sanctuary.battle, allies: db.sanctuary.battle.allies.map((p: any) => ({ ...p, seat: 1 })) };
    const state = createTacticalBattle(
      { data, units: pick("tactical-unit") as never, skills: pick("tactical-skill") as never },
      { id: "c", players: [{ id: "a", name: "Alice" }, { id: "b", name: "Bob" }] },
    );
    expect(state.units.filter((u) => u.team === "ally").every((u) => u.owner === "b")).toBe(true);
  });
});

/** Two fake players on the same map, each with a GUI recording packets. */
function coop() {
  vi.useFakeTimers();
  const module = provideTacticalServer({ units: pick("tactical-unit"), skills: pick("tactical-skill"), encounters: pick("tactical-encounter") }) as any;
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
    const command = async (value: unknown) => {
      listeners.get("command")!({ revision: state().revision, command: value });
      await vi.advanceTimersByTimeAsync(0);
    };
    return { id, player, gui, packets, listeners, state, command };
  };
  const a = make(`a${Math.random()}`, "Alice");
  const b = make(`b${Math.random()}`, "Bob");
  const done = startTactical({ players: [a.player as never, b.player as never], encounter: "sanctuary" });
  return { module: module[0].server, a, b, done };
}
afterEach(() => vi.useRealTimers());

describe("coop session", () => {
  it("opens one HUD per player and starts once both are ready", async () => {
    const { a, b } = coop();
    await vi.advanceTimersByTimeAsync(0);
    expect(a.gui.open).toHaveBeenCalledOnce();
    expect(b.gui.open).toHaveBeenCalledOnce();
    expect(a.state().players.map((p) => p.name)).toEqual(["Alice", "Bob"]);
    await a.command({ type: "start" });
    expect(b.state().ready).toEqual([a.id]);
    expect(b.state().started).toBe(false);
    await b.command({ type: "start" });
    expect(a.state().started).toBe(true);
    expect(a.state().ready).toEqual([]);
  });
  it("refuses an order on the partner's unit, broadcasts the others", async () => {
    const { a, b } = coop();
    await vi.advanceTimersByTimeAsync(0);
    await a.command({ type: "start" });
    await b.command({ type: "start" });
    await vi.advanceTimersByTimeAsync(1500);
    const bobs = a.state().units.find((u) => u.owner === b.id)!;
    await a.command({ type: "wait", unitId: bobs.id });
    expect(a.packets.at(-1)?.error).toBe("t.error.owner");
    expect(b.packets.at(-1)?.error).toBeUndefined();
    await b.command({ type: "wait", unitId: bobs.id });
    expect(a.state().units.find((u) => u.id === bobs.id)!.acted).toBe(true);
  });
  it("gives the units of a player who leaves to the partner, and resolves when both have left", async () => {
    const { a, b, done } = coop();
    await vi.advanceTimersByTimeAsync(0);
    await a.command({ type: "start" });
    // Bob leaves before being ready: Alice was waiting for him, the battle starts.
    await stopTactical(b.player as never);
    expect(isInTactical(b.player as never)).toBe(false);
    expect(a.packets.some((p) => p.left === "Bob")).toBe(true);
    expect(a.state().started).toBe(true);
    expect(a.state().units.filter((u) => u.team === "ally").every((u) => u.owner === a.id)).toBe(true);
    expect(a.state().players.map((p) => p.name)).toEqual(["Alice"]);
    await stopTactical(a.player as never);
    expect((await done).outcome).toBe("abandon");
  });
  it("applies a partner's order sent on an older revision once the running action is over", async () => {
    const { a, b } = coop();
    await vi.advanceTimersByTimeAsync(0);
    await a.command({ type: "start" });
    await b.command({ type: "start" });
    await vi.advanceTimersByTimeAsync(1500);
    const revision = b.state().revision;
    const alices = a.state().units.find((u) => u.owner === a.id)!;
    const bobs = b.state().units.find((u) => u.owner === b.id)!;
    await a.command({ type: "wait", unitId: alices.id });
    b.listeners.get("command")!({ revision, command: { type: "wait", unitId: bobs.id } });
    await vi.advanceTimersByTimeAsync(1500);
    expect(b.packets.some((p) => p.error)).toBe(false);
    expect(a.state().units.find((u) => u.id === bobs.id)!.acted).toBe(true);
  });
});
