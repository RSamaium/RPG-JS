import { describe, expect, it } from "vitest";
import {
  createStudioActionBattleAudio,
  createStudioActionBattlePreset,
} from "../src/action-battle-audio";

describe("Studio Action Battle audio", () => {
  it("maps project settings with Studio timing defaults", () => {
    const audio = createStudioActionBattleAudio({
      battleMusic: "battle-theme",
      attack: "sword",
    });
    const attack = audio.attack as Function;
    const battle = (audio.music as any).battle;

    expect(attack({ moment: "attack" })).toBe("sword");
    expect(battle({ engine: { globalConfig: {} } })).toBe("battle-theme");
    expect(audio.music).toMatchObject({
      fadeInMs: 600,
      fadeOutMs: 900,
      exitDelayMs: 1500,
    });
  });

  it("returns one preset for Studio animations and audio", () => {
    const preset = createStudioActionBattlePreset();
    expect(preset.animations).toBeDefined();
    expect(preset.audio).toBeDefined();
  });
});
