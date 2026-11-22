import { describe, it, expect, vi, afterEach } from "vitest";
vi.mock("@rpgjs/server", () => ({ defineModule: (value: unknown) => value }));
vi.mock("@rpgjs/common", () => ({ createModule: (_name: string, value: unknown) => value }));
import { provideTacticalServer, startTactical, watchTactical, getTactical, isInTactical, stopTactical, type TacticalServerHooks } from "../server";
import type { BattlePacket } from "../core";
import { emberDatabase } from "../demo/database";

const db = emberDatabase as Record<string, any>;
const pick = (type: string) => Object.fromEntries(Object.entries(db).filter(([, r]) => r._type === type));
const map = {};

function fake(name: string, onMap: object = map) {
  const packets: BattlePacket[] = [];
  const listeners = new Map<string, (data?: any) => void>();
  let resolveOpen: (value: unknown) => void = () => {};
  const gui = {
    open: vi.fn((data: BattlePacket) => (packets.push(data), new Promise((resolve) => (resolveOpen = resolve)))),
    update: (data: BattlePacket) => packets.push(data),
    on: (event: string, cb: (data?: any) => void) => listeners.set(event, cb),
    close: vi.fn((result: unknown) => resolveOpen(result)),
  };
  const player = { id: `${name}${Math.random()}`, name, x: 0, y: 0, graphics: ["hero"], setGraphic: vi.fn(), gui: () => gui, getCurrentMap: () => onMap };
  return { player: player as any, gui, packets, listeners, state: () => packets.at(-1)!.state };
}
function setup(hooks?: TacticalServerHooks) {
  vi.useFakeTimers();
  const module = provideTacticalServer({ units: pick("tactical-unit"), skills: pick("tactical-skill"), encounters: pick("tactical-encounter"), hooks }) as any;
  return module[0].server;
}
afterEach(() => vi.useRealTimers());

describe("spectators", () => {
  it("join mid-battle, see every packet, command nothing and leave when they want", async () => {
    setup();
    const alice = fake("Alice");
    const carol = fake("Carol");
    const done = startTactical(alice.player, "sanctuary");
    await vi.advanceTimersByTimeAsync(0);
    alice.listeners.get("command")!({ revision: 0, command: { type: "start" } });
    await vi.advanceTimersByTimeAsync(1500);
    expect(getTactical(alice.player)?.players).toEqual([alice.player]);
    const watching = watchTactical(carol.player, alice.player);
    await vi.advanceTimersByTimeAsync(0);
    expect(carol.gui.open).toHaveBeenCalledOnce();
    expect(carol.state().started).toBe(true);
    expect(alice.state().spectators).toBe(1);
    expect(isInTactical(carol.player)).toBe(true);
    expect(getTactical(carol.player)).toBeUndefined(); // watching, not playing
    expect(carol.listeners.has("command")).toBe(false);
    alice.listeners.get("command")!({ revision: alice.state().revision, command: { type: "endPhase" } });
    await vi.advanceTimersByTimeAsync(0);
    expect(carol.packets.at(-1)?.event?.kind).toBe("phase");
    carol.listeners.get("close")!();
    expect(await watching).toBe(true);
    expect(isInTactical(carol.player)).toBe(false);
    expect(alice.state().spectators).toBe(0);
    await stopTactical(alice.player);
    await done;
  });
  it("can be refused by onSpectate, or when on another map or already busy", async () => {
    setup({ onSpectate: (spectator) => spectator.name !== "Eve" });
    const alice = fake("Alice");
    void startTactical(alice.player, "sanctuary");
    await vi.advanceTimersByTimeAsync(0);
    expect(await watchTactical(fake("Eve").player, alice.player)).toBe(false);
    expect(await watchTactical(fake("Far", {}).player, alice.player)).toBe(false);
    expect(await watchTactical(alice.player, alice.player)).toBe(false);
    expect(await watchTactical(fake("Nobody").player, "no-battle")).toBe(false);
    await stopTactical(alice.player);
  });
  it("start with the battle and go back to the map when every player has left", async () => {
    setup();
    const alice = fake("Alice");
    const carol = fake("Carol");
    const done = startTactical({ players: [alice.player], encounter: "sanctuary", spectators: [carol.player] });
    await vi.advanceTimersByTimeAsync(0);
    expect(carol.gui.open).toHaveBeenCalledOnce();
    expect(getTactical(alice.state().id)?.spectators()).toEqual([carol.player]);
    await stopTactical(alice.player);
    await done;
    await vi.advanceTimersByTimeAsync(0);
    expect(carol.gui.close).toHaveBeenCalled();
    expect(isInTactical(carol.player)).toBe(false);
  });
});
