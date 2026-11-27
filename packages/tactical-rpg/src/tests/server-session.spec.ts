import { describe, it, expect, vi, afterEach } from "vitest";
vi.mock("@rpgjs/server", () => ({ defineModule: (value: unknown) => value }));
vi.mock("@rpgjs/common", () => ({ createModule: (_name: string, value: unknown) => value }));
import { provideTacticalServer, startTacticalBattle, isInTacticalBattle, type TacticalServerHooks } from "../server";
import type { BattlePacket, TacticalResult } from "../core/types";
import { emberDatabase } from "./demo-database";

const db = emberDatabase as Record<string, any>;
const pick = (type: string) => Object.fromEntries(Object.entries(db).filter(([, r]) => r._type === type));

/** A fake player whose GUI records packets and exposes its interactions. */
let players = 0;
function session(hooks?: TacticalServerHooks) {
  vi.useFakeTimers();
  const module = provideTacticalServer({
    units: pick("tactical-unit"),
    skills: pick("skill"),
    encounters: pick("tactical-encounter"),
    hooks,
  }) as unknown as { server: { player: { onDisconnected(p: unknown): void } } }[];
  const packets: BattlePacket[] = [];
  const listeners = new Map<string, (data?: any) => void>();
  let resolveOpen: (value: unknown) => void = () => {};
  const gui = {
    open: vi.fn((data: BattlePacket) => {
      packets.push(data);
      return new Promise((resolve) => (resolveOpen = resolve));
    }),
    update: (data: BattlePacket) => packets.push(data),
    on: (name: string, cb: (data?: any) => void) => listeners.set(name, cb),
    close: vi.fn((result: unknown) => resolveOpen(result)),
  };
  const player = { id: `p${++players}`, x: 960, y: 704, graphics: ["hero"], setGraphic: vi.fn(), gui: () => gui };
  const done = startTacticalBattle(player as never, "sanctuary");
  const state = () => packets.at(-1)!.state;
  const flush = () => vi.advanceTimersByTimeAsync(0);
  const command = async (value: unknown, revision = state().revision) => {
    listeners.get("command")!({ revision, command: value });
    await flush();
  };
  return { module: module[0].server, packets, listeners, player, gui, done, state, command, flush };
}
afterEach(() => vi.useRealTimers());

describe("startTacticalBattle (GUI transport)", () => {
  it("opens the HUD with the encounter from the data and hides the player", async () => {
    const s = session();
    await s.flush();
    expect(s.gui.open).toHaveBeenCalledOnce();
    expect(s.state().units.map((u) => u.name)).toEqual(["Kael", "Eryn", "Lior", "Cinder", "Ember", "Flint"]);
    expect(s.state().meta.name).toBe("The Sanctuary of Ashes");
    expect(s.player.setGraphic).toHaveBeenCalledWith("tactical-hidden");
    expect(isInTacticalBattle(s.player as never)).toBe(true);
  });
  it("rejects stale and malformed commands without mutation", async () => {
    const s = session();
    await s.flush();
    await s.command({ type: "start" }, -1);
    expect(s.packets.at(-1)?.error).toBe("tactical.error.stale");
    expect(s.state().revision).toBe(0);
    await s.command({ type: "unknown" });
    expect(s.state().started).toBe(false);
  });
  it("locks duplicate input and automatically completes the enemy phase", async () => {
    const s = session();
    await s.flush();
    await s.command({ type: "start" });
    await s.command({ type: "endPhase" });
    expect(s.packets.at(-1)?.error).toBe("tactical.error.busy");
    await vi.advanceTimersByTimeAsync(1500);
    await s.command({ type: "endPhase" });
    expect(s.state().phase).toBe("enemy");
    await vi.advanceTimersByTimeAsync(15000);
    expect(s.state().phase).toBe("ally");
    expect(s.state().round).toBe(2);
  });
  it("lets hooks veto commands and change damage, then resolves with the result", async () => {
    const onEnd = vi.fn();
    const s = session({
      onCommand: (_p, _b, env) => env.command.type !== "wait",
      onDamage: () => 999,
      onEnd,
    });
    await s.flush();
    await s.command({ type: "start" });
    await vi.advanceTimersByTimeAsync(1500);
    await s.command({ type: "wait", unitId: "ally-kael-0" });
    expect(s.packets.at(-1)?.error).toBe("tactical.error.refused");
    // Every allied unit one-shots an enemy in range once they are close: move the enemies next to them.
    const st = s.state();
    for (const [i, enemy] of st.units.filter((u) => u.team === "enemy").entries()) {
      const ally = st.units.filter((u) => u.team === "ally")[i];
      enemy.x = ally.x;
      enemy.y = ally.y - 1;
    }
    for (const ally of st.units.filter((u) => u.team === "ally")) {
      await vi.advanceTimersByTimeAsync(1500);
      await s.command({ type: "attack", unitId: ally.id, targetId: st.units.find((u) => u.team === "enemy" && u.x === ally.x)!.id });
    }
    expect(s.state().winner).toBe("ally");
    expect(onEnd).toHaveBeenCalledOnce();
    s.listeners.get("close")!();
    const result: TacticalResult = await s.done;
    expect(result).toMatchObject({ outcome: "victory", rounds: 1, survivors: 3 });
    await s.flush();
    expect(s.player.setGraphic).toHaveBeenLastCalledWith(["hero"]);
    expect(isInTacticalBattle(s.player as never)).toBe(false);
  });
  it("onSetup: lets a game change the battle before it is shown for the first time", async () => {
    const s = session({
      onSetup: (_player, _battle, state) => {
        state.units = state.units.filter((u) => u.team === "ally");
        state.meta.name = "Changed";
      },
    });
    await s.flush();
    expect(s.state().meta.name).toBe("Changed");
    expect(s.state().units.every((u) => u.team === "ally")).toBe(true);
  });
  it("passes the rule hooks onMove, onPhase and onDefeat of a game to the rules", async () => {
    const moved = vi.fn();
    const phases = vi.fn();
    const s = session({ onMove: moved, onPhase: phases });
    await s.flush();
    await s.command({ type: "start" });
    await vi.advanceTimersByTimeAsync(1500);
    const ally = s.state().units.find((u) => u.team === "ally")!;
    await s.command({ type: "move", unitId: ally.id, cell: { x: ally.x, y: ally.y + 1 } });
    expect(s.packets.at(-1)?.error).toBeUndefined();
    expect(moved).toHaveBeenCalledOnce();
    expect(moved.mock.calls[0][0]).toMatchObject({ from: { x: ally.x, y: ally.y }, player: s.player });
    expect(moved.mock.calls[0][0].battle.id).toBe(s.state().id);
    await vi.advanceTimersByTimeAsync(1500);
    await s.command({ type: "endPhase" });
    expect(phases).toHaveBeenCalledWith(expect.objectContaining({ phase: "enemy", round: 1 }));
  });
  it("aborts on disconnect: no more AI packets, resolves as abandoned", async () => {
    const s = session();
    await s.flush();
    await s.command({ type: "start" });
    await vi.advanceTimersByTimeAsync(1500);
    await s.command({ type: "endPhase" });
    s.module.player.onDisconnected(s.player);
    const count = s.packets.length;
    await vi.advanceTimersByTimeAsync(15000);
    expect(s.packets).toHaveLength(count);
    expect((await s.done).outcome).toBe("abandon");
  });
  it("plays a move and the action sent with it in one order", async () => {
    const s = session();
    await s.flush();
    await s.command({ type: "start" });
    await vi.advanceTimersByTimeAsync(1500);
    const kael = s.state().units.find((u) => u.id === "ally-kael-0")!;
    s.listeners.get("command")!({
      revision: s.state().revision,
      command: { type: "move", unitId: kael.id, cell: { x: kael.x, y: kael.y - 1 } },
      then: { type: "wait", unitId: kael.id },
    });
    await s.flush();
    const events = s.packets.slice(-2).map((p) => p.event?.kind);
    expect(events).toEqual(["move", "wait"]);
    expect(s.state().units.find((u) => u.id === kael.id)).toMatchObject({ y: kael.y - 1, moved: true, acted: true });
    // A refused action: the move stays, the error is reported.
    const eryn = s.state().units.find((u) => u.id === "ally-eryn-1")!;
    await vi.advanceTimersByTimeAsync(2500);
    s.listeners.get("command")!({
      revision: s.state().revision,
      command: { type: "move", unitId: eryn.id, cell: { x: eryn.x, y: eryn.y - 1 } },
      then: { type: "attack", unitId: eryn.id, targetId: "nobody" },
    });
    await s.flush();
    expect(s.packets.at(-1)?.error).toBe("tactical.error.target");
    expect(s.state().units.find((u) => u.id === eryn.id)).toMatchObject({ moved: true, acted: false });
  });
  it("shares the speed: a pace request changes the state and the AI pacing", async () => {
    const s = session();
    await s.flush();
    s.listeners.get("pace")!({ pace: 3 });
    expect(s.state().pace).toBe(3);
    s.listeners.get("pace")!({ pace: 9 });
    expect(s.state().pace).toBe(1);
    s.listeners.get("pace")!({ pace: 3 });
    await s.command({ type: "start" });
    await vi.advanceTimersByTimeAsync(500);
    await s.command({ type: "endPhase" });
    const revision = s.state().revision;
    // 1650 ms / 3: the first enemy action comes within 600 ms.
    await vi.advanceTimersByTimeAsync(600);
    expect(s.state().revision).toBeGreaterThan(revision);
  });
});
