import { MAXHP } from "@rpgjs/server";
import { afterEach, describe, expect, test, vi } from "vitest";
import { BattleAi } from "./ai.server";
import { isActionBattleEnabled, setActionBattleOptions } from "./config";
import { ACTION_BATTLE_SKILL_USE, createActionBattleServer } from "./server";

const createSkillPlayer = (id: string, onUse: () => void) => {
  const skill = {
    id: "ice", _type: "skill", spCost: 10, hitRate: 1,
    targeting: { range: 0, aoeMask: ["#"] },
    action: { mode: "instant", target: "enemy" }, onUse,
  };
  const map = { getEvents: () => [], getPlayers: () => [], clientVisual: vi.fn() };
  return {
    id, sp: 100, x: () => 0, y: () => 0, hitbox: () => ({ w: 32, h: 32 }),
    getDirection: () => "right", skills: () => [{ id: "ice" }], getSkill: () => skill,
    databaseById: () => skill, hasEffect: () => false, getCurrentMap: () => map,
    getGui: () => null, initializeHotbar: vi.fn(),
  };
};

describe("action battle enabled option", () => {
  afterEach(() => setActionBattleOptions({}));

  test("is on by default and accepts a boolean or a function", () => {
    expect(isActionBattleEnabled({}, {})).toBe(true);
    expect(isActionBattleEnabled({}, { enabled: false })).toBe(false);
    const enabled = vi.fn(({ player }) => player?.id === "hero");
    expect(isActionBattleEnabled({ player: { id: "hero" } as any }, { enabled })).toBe(true);
    expect(isActionBattleEnabled({ player: { id: "other" } as any }, { enabled })).toBe(false);
  });

  test("leaves the input of a player alone when it is off for that player", () => {
    const onUse = vi.fn();
    const server = createActionBattleServer({
      enabled: ({ player }) => player?.id === "hero",
    });
    const input = { action: ACTION_BATTLE_SKILL_USE, data: { id: "ice" } };

    (server.player?.onInput as any)(createSkillPlayer("other", onUse), input);
    expect(onUse).not.toHaveBeenCalled();

    (server.player?.onInput as any)(createSkillPlayer("hero", onUse), input);
    expect(onUse).toHaveBeenCalledTimes(1);
  });

  test("does not open the hotbar of a player it skips", () => {
    const server = createActionBattleServer({ enabled: false });
    const player = createSkillPlayer("hero", vi.fn());
    (server.player?.onJoinMap as any)(player);
    expect(player.initializeHotbar).not.toHaveBeenCalled();
  });

  test("starts no AI for an event it skips", () => {
    createActionBattleServer({ enabled: ({ event }) => event?.id !== "calm" });
    const createEvent = (id: string) => ({
      id, hp: 0, param: { [MAXHP]: 10 },
      attachShape: vi.fn(), mergeComponents: vi.fn(), componentsTop: vi.fn(() => null),
      interactive: { set: vi.fn() }, getCurrentMap: vi.fn(() => ({})),
      x: vi.fn(() => 0), y: vi.fn(() => 0),
    });

    const calm = createEvent("calm");
    const ai = new BattleAi(calm as any, {});
    expect(ai.disabled).toBe(true);
    expect(calm.mergeComponents).not.toHaveBeenCalled();
    expect(calm.interactive.set).not.toHaveBeenCalled();

    const wild = createEvent("wild");
    const active = new BattleAi(wild as any, {});
    expect(active.disabled).toBe(false);
    expect(wild.mergeComponents).toHaveBeenCalled();
    active.destroy?.();
  });
});
