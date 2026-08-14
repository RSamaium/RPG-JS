// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { RpgAudioManager } from "./AudioManager";

const createHost = () => {
  const sound = { play: vi.fn(() => 7), volume: vi.fn(), stereo: vi.fn() };
  return {
    sound,
    host: { getSound: vi.fn(() => sound), addSound: vi.fn() },
  };
};

describe("RpgAudioManager", () => {
  it("persists four independent channels per project", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
    const { host } = createHost();
    const manager = new RpgAudioManager(host, storage);
    manager.configure({ projectId: "game-a" });
    manager.setVolume("master", 0.5);
    manager.setVolume("ui", 0.4);

    const restored = new RpgAudioManager(host, storage);
    restored.configure({ projectId: "game-a" });
    expect(restored.getVolume("master")).toBe(0.5);
    expect(restored.getVolume("ui")).toBe(0.4);
    expect(restored.channelGain("ui")).toBe(0.4);
  });

  it("uses the project theme for every menu and built-in cues for blank fields", async () => {
    const { host } = createHost();
    const manager = new RpgAudioManager(host, undefined);
    manager.configure({
      ui: {
        confirm: "theme-confirm",
        navigate: "",
        menus: { shop: { confirm: "stale-shop-confirm" } },
      } as any,
    });

    await manager.playUi("confirm");
    await manager.playUi("confirm");
    await manager.playUi("cancel");
    await manager.playUi("navigate");

    expect(host.getSound).toHaveBeenNthCalledWith(1, "theme-confirm");
    expect(host.getSound).toHaveBeenNthCalledWith(2, "theme-confirm");
    expect(host.getSound).toHaveBeenNthCalledWith(3, "rpgjs-ui-cancel");
    expect(host.getSound).toHaveBeenNthCalledWith(4, "rpgjs-ui-navigate");
  });

  it("attenuates and pans spatial sound effects", async () => {
    const { host, sound } = createHost();
    const manager = new RpgAudioManager(host, undefined);
    manager.setVolume("sfx", 0.8);

    await manager.play("hit", { position: { x: 352, y: 0 }, listener: { x: 0, y: 0 } });

    expect(sound.volume).toHaveBeenCalledWith(0.4, 7);
    expect(sound.stereo).toHaveBeenCalledWith(0.41250000000000003, 7);
  });

  it("preserves a registered sound volume when playSound does not override it", async () => {
    const sound = {
      play: vi.fn(() => 9),
      volume: vi.fn((value?: number) => value === undefined ? 0.35 : value),
    };
    const manager = new RpgAudioManager({
      getSound: vi.fn(() => sound),
      addSound: vi.fn(),
    }, undefined);
    manager.setVolume("sfx", 0.5);

    await manager.play("ambient");

    expect(sound.volume).toHaveBeenLastCalledWith(0.175, 9);
  });

  it("honours cue cooldowns", async () => {
    const { host, sound } = createHost();
    const manager = new RpgAudioManager(host, undefined);
    const cue = { id: "attack", cooldownMs: 100 };

    await manager.play(cue);
    await manager.play(cue);

    expect(sound.play).toHaveBeenCalledOnce();
  });

  it("materializes dynamically resolved Studio media before playing", async () => {
    const playable = { play: vi.fn(() => 3), volume: vi.fn() };
    const host = {
      getSound: vi.fn(() => ({ id: "media-id", src: "/media/custom.ogg" })),
      addSound: vi.fn(() => playable),
    };
    const manager = new RpgAudioManager(host, undefined);

    await manager.play("media-id");

    expect(host.addSound).toHaveBeenCalledWith({ id: "media-id", src: "/media/custom.ogg" });
    expect(playable.play).toHaveBeenCalledOnce();
  });

  it("notifies the host when a project has no preferences or invalid storage", () => {
    const values = new Map<string, string>([
      ["rpgjs:audio:broken", "not-json"],
    ]);
    const onPreferencesChange = vi.fn();
    const { host } = createHost();
    const manager = new RpgAudioManager({ ...host, onPreferencesChange }, {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    });
    onPreferencesChange.mockClear();

    manager.configure({ projectId: "empty" });
    manager.configure({ projectId: "broken" });

    expect(onPreferencesChange).toHaveBeenNthCalledWith(1, {
      master: 1,
      music: 1,
      sfx: 1,
      ui: 1,
    });
    expect(onPreferencesChange).toHaveBeenNthCalledWith(2, {
      master: 1,
      music: 1,
      sfx: 1,
      ui: 1,
    });
  });
});
