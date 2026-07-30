import { describe, expect, it } from "vitest";
import {
  createStudioActionBattleAudio,
  createStudioActionBattlePreset,
  normalizeStudioHotbarSettings,
  resolveStudioHotbarSettings,
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
    expect(preset.ui?.hotbar).toBeDefined();
  });

  it("normalizes Studio hotbar data with safe defaults and bounds", () => {
    expect(normalizeStudioHotbarSettings(undefined)).toEqual({
      enabled: false,
      content: "skills",
      slotCount: 10,
    });
    expect(normalizeStudioHotbarSettings({
      enabled: true,
      content: "mixed",
      slotCount: 25,
    })).toEqual({
      enabled: true,
      content: "mixed",
      slotCount: 10,
    });
  });

  it("resolves the project hotbar binding", () => {
    const map = {
      globalConfig: {
        menus: {
          hotbar: {
            enabled: true,
            guiId: null,
            settings: { content: "skills", slotCount: 8 },
          },
        },
      },
    };
    const player = { getCurrentMap: () => map } as any;

    expect(resolveStudioHotbarSettings(player)).toEqual({
      enabled: true,
      content: "skills",
      slotCount: 8,
    });
  });

  it("maps Studio content choices to Action Battle entry types", () => {
    const preset = createStudioActionBattlePreset();
    const hotbar = preset.ui?.hotbar as any;
    const map = {
      globalConfig: {
        menus: {
          hotbar: {
            enabled: true,
            guiId: null,
            settings: { content: "mixed", slotCount: 7 },
          },
        },
      },
    };
    const player = { getCurrentMap: () => map };

    expect(hotbar.enabled(player)).toBe(true);
    expect(hotbar.capacity(player)).toBe(7);
    expect(hotbar.allowedEntryTypes(player)).toEqual(["skill", "item"]);
  });
});
