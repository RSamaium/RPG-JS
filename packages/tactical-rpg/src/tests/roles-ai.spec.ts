import { describe, it, expect, vi, afterEach } from "vitest";
vi.mock("@rpgjs/server", () => ({ defineModule: (value: unknown) => value }));
vi.mock("@rpgjs/common", () => ({ createModule: (_name: string, value: unknown) => value }));
import { provideTacticalServer, startTacticalBattle, stopTacticalBattle, type TacticalServerHooks } from "../server";
import { chooseAction, createTacticalBattle, roleOf, transition, DEFAULT_ROLES, type BattlePacket, type BattleState } from "../core";
import { emberDatabase } from "./demo-database";

const db = emberDatabase as Record<string, any>;
const pick = (type: string) => Object.fromEntries(Object.entries(db).filter(([, r]) => r._type === type));
const setup = (encounter: string) => ({
  name: db[encounter].name,
  data: db[encounter].tactical,
  units: pick("tactical-unit") as never,
  skills: pick("skill") as never,
  roles: pick("tactical-role") as never,
});

describe("roles", () => {
  it("declared roles reach the state; built-in ones need nothing", () => {
    const state = createTacticalBattle(setup("rampart"), { id: "r" });
    expect(Object.keys(state.roles).sort()).toEqual(["archer", "crossbow", "mage", "occultist", "paladin", "warrior"]);
    expect(state.roles.paladin).toMatchObject({ name: "Paladin", glyph: "✠", attack: "melee" });
    expect(roleOf(state, { role: "warrior" })).toEqual(DEFAULT_ROLES.warrior);
  });
  it("an undeclared custom role is an error", () => {
    const units = { ...pick("tactical-unit"), x: { name: "X", tactical: { role: "bard", battler: "b", stats: { hp: 1, sp: 0, power: 1, range: 1, move: 1 } } } };
    expect(() =>
      createTacticalBattle({ data: { allies: [{ unit: "x", x: 0, y: 0 }], enemies: [] }, units: units as never, skills: {} }, { id: "r" }),
    ).toThrow('Unknown role "bard"');
  });
});

describe("any number of units per side", () => {
  it("4 against 6, unique ids, a full game played by the default AI on both sides", () => {
    let state: BattleState = transition(createTacticalBattle(setup("rampart"), { id: "r" }), { type: "start" }, "ally").state;
    expect(state.units.filter((u) => u.team === "ally")).toHaveLength(4);
    expect(state.units.filter((u) => u.team === "enemy")).toHaveLength(6);
    expect(new Set(state.units.map((u) => u.id)).size).toBe(10);
    for (let i = 0; i < 600 && !state.winner; i++) state = transition(state, chooseAction(state)!, state.phase).state;
    expect(state.winner).not.toBeNull();
  });
});

const map = {};
function fake() {
  const packets: BattlePacket[] = [];
  const listeners = new Map<string, (data?: any) => void>();
  let resolveOpen: (value: unknown) => void = () => {};
  const gui = {
    open: vi.fn((data: BattlePacket) => (packets.push(data), new Promise((resolve) => (resolveOpen = resolve)))),
    update: (data: BattlePacket) => packets.push(data),
    on: (event: string, cb: (data?: any) => void) => listeners.set(event, cb),
    close: vi.fn((result: unknown) => resolveOpen(result)),
  };
  const player = { id: `p${Math.random()}`, name: "P", x: 0, y: 0, graphics: ["hero"], setGraphic: vi.fn(), gui: () => gui, getCurrentMap: () => map } as any;
  return { player, packets, listeners, state: () => packets.at(-1)!.state };
}
afterEach(() => vi.useRealTimers());

describe("onChooseAction", () => {
  const run = async (hooks: TacticalServerHooks) => {
    vi.useFakeTimers();
    provideTacticalServer({ units: pick("tactical-unit"), skills: pick("skill"), encounters: pick("tactical-encounter"), roles: pick("tactical-role"), hooks });
    const p = fake();
    void startTacticalBattle(p.player, "rampart");
    await vi.advanceTimersByTimeAsync(0);
    p.listeners.get("command")!({ revision: 0, command: { type: "start" } });
    await vi.advanceTimersByTimeAsync(1500);
    p.listeners.get("command")!({ revision: p.state().revision, command: { type: "endPhase" } });
    await vi.advanceTimersByTimeAsync(1700);
    return p;
  };
  it("replaces the default AI's command for the unit about to act", async () => {
    const seen: string[] = [];
    const p = await run({
      onChooseAction({ unit, suggested }) {
        seen.push(`${unit.id}:${suggested.type}`);
        return { type: "wait", unitId: unit.id };
      },
    });
    const event = p.packets.filter((x) => x.event).at(-1)!.event!;
    expect(event).toMatchObject({ kind: "wait", unitId: "enemy-cinder-0" });
    expect(seen[0]).toMatch(/^enemy-cinder-0:(move|attack)$/);
    await stopTacticalBattle(p.player);
  });
  it("falls back to the suggested command when the rules refuse the hook's", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const p = await run({ onChooseAction: ({ unit }) => ({ type: "attack", unitId: unit.id, targetId: "nobody" }) });
    const event = p.packets.filter((x) => x.event).at(-1)!.event!;
    expect(event.unitId).toBe("enemy-cinder-0");
    expect(["move", "attack"]).toContain(event.kind);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    await stopTacticalBattle(p.player);
  });
});
