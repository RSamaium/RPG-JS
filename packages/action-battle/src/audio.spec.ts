import { describe, expect, it, vi } from "vitest";
import {
  ACTION_BATTLE_COMBAT_AUDIO_ID,
  createActionBattleCombatAudioVisual,
  playActionBattleMomentAudio,
  updateActionBattleThreat,
} from "./audio";

describe("action battle audio", () => {
  it("prefers the skill sound over the generic skill cue", () => {
    const engine = { playSound: vi.fn() };
    playActionBattleMomentAudio(
      engine,
      { skill: "generic-cast" },
      { moment: "castSkill", skill: { sound: "fire-cast" } },
    );

    expect(engine.playSound).toHaveBeenCalledWith("fire-cast", { volume: 1 });
  });

  it("layers impact and reaction cues, using defeat instead of hurt on lethal hits", () => {
    const engine = { playSound: vi.fn() };
    playActionBattleMomentAudio(
      engine,
      { hit: "impact", hurt: "grunt", die: "death" },
      { moment: "hurt", result: { defeated: true } },
    );

    expect(engine.playSound).toHaveBeenCalledWith("impact", { volume: 1 });
    expect(engine.playSound).toHaveBeenCalledWith("death", { volume: 1 });
    expect(engine.playSound).not.toHaveBeenCalledWith("grunt", expect.anything());
  });

  it("keeps threat snapshots isolated per player", () => {
    const playerA = { clientVisual: vi.fn() };
    const playerB = { clientVisual: vi.fn() };
    const enemyA = {};
    const enemyB = {};

    updateActionBattleThreat(enemyA, playerA, true, {
      enemyId: "slime",
      music: "slime-theme",
    });
    updateActionBattleThreat(enemyB, playerB, true, {
      enemyId: "boss",
      music: "boss-theme",
      boss: true,
    });

    expect(playerA.clientVisual).toHaveBeenLastCalledWith(
      ACTION_BATTLE_COMBAT_AUDIO_ID,
      { threats: [expect.objectContaining({ enemyId: "slime" })] },
    );
    expect(playerB.clientVisual).toHaveBeenLastCalledWith(
      ACTION_BATTLE_COMBAT_AUDIO_ID,
      { threats: [expect.objectContaining({ enemyId: "boss", priority: 100 })] },
    );
  });

  it("selects enemy, map, then project music and keeps the current source on ties", () => {
    const music = {
      enter: vi.fn(),
      leave: vi.fn(),
      contextId: "wolf",
    };
    const handler = createActionBattleCombatAudioVisual({
      music: { battle: "project-theme" },
    });
    handler({
      engine: {
        music,
        sceneMap: {
          data: () => ({ params: { combatMusic: "map-theme" } }),
        },
      },
      data: {
        threats: [
          { enemyId: "bat", priority: 0, order: 1 },
          { enemyId: "wolf", music: "wolf-theme", priority: 0, order: 2 },
        ],
      },
    });

    expect(music.enter).toHaveBeenCalledWith(
      "wolf-theme",
      expect.objectContaining({ battle: "project-theme" }),
    );
    expect(music.contextId).toBe("wolf");
  });
});
