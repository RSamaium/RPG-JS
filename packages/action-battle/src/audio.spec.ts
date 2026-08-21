import { signal } from "canvasengine";
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

    expect(engine.playSound).toHaveBeenCalledWith(
      "fire-cast",
      expect.objectContaining({ volume: 1, channel: "sfx" }),
    );
  });

  it("layers impact and reaction cues, using defeat instead of hurt on lethal hits", () => {
    const engine = { playSound: vi.fn() };
    playActionBattleMomentAudio(
      engine,
      { hit: "impact", hurt: "grunt", die: "death" },
      { moment: "hurt", result: { defeated: true } },
    );

    expect(engine.playSound).toHaveBeenCalledWith(
      "impact",
      expect.objectContaining({ volume: 1, channel: "sfx" }),
    );
    expect(engine.playSound).toHaveBeenCalledWith(
      "death",
      expect.objectContaining({ volume: 1, channel: "sfx" }),
    );
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

  it("selects enemy, then project music and keeps the current source on ties", () => {
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

  it("does not duck map music when no battle track is configured", () => {
    const music = { enter: vi.fn(), leave: vi.fn(), contextId: undefined, overrideId: undefined };
    createActionBattleCombatAudioVisual({ music: {} })({
      engine: { music, sceneMap: { data: () => ({ params: {} }) } },
      data: { threats: [{ enemyId: "slime", priority: 0, order: 1 }] },
    });

    expect(music.enter).not.toHaveBeenCalled();
    expect(music.leave).not.toHaveBeenCalled();
  });

  it("unwraps CanvasEngine positions before using the public sound API", () => {
    const playSound = vi.fn();
    const player = { x: signal(32), y: signal(48) };
    const enemy = { x: signal(160), y: signal(96) };

    playActionBattleMomentAudio(
      { playSound, scene: { currentPlayer: signal(player) } },
      { attack: "sword" },
      { moment: "attack", entity: enemy },
    );

    expect(playSound).toHaveBeenCalledWith("sword", expect.objectContaining({
      position: { x: 160, y: 96 },
      listener: { x: 32, y: 48 },
    }));
  });
});
