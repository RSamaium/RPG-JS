import { afterEach, describe, expect, it, vi } from "vitest";
import { RpgMusicManager } from "./MusicManager";

const createSound = () => {
  let currentVolume = 0.8;
  return {
    play: vi.fn(),
    stop: vi.fn(),
    loop: vi.fn(),
    fade: vi.fn((from: number, to: number) => {
      currentVolume = to;
    }),
    volume: vi.fn((value?: number) => {
      if (value !== undefined) currentVolume = value;
      return currentVolume;
    }),
  };
};

describe("RpgMusicManager", () => {
  afterEach(() => vi.useRealTimers());

  it("fades map music out before starting one stable override", async () => {
    vi.useFakeTimers();
    const mapSound = createSound();
    const sound = createSound();
    const manager = new RpgMusicManager({
      getSound: vi.fn(() => sound),
      createSound: vi.fn(() => mapSound),
    });

    await manager.setMap("map.mp3");
    await manager.enter("battle", { fadeInMs: 100, volume: 0.7 });
    await manager.enter("battle", { fadeInMs: 100, volume: 0.7 });
    expect(mapSound.play).toHaveBeenCalledOnce();
    expect(mapSound.fade).toHaveBeenCalledWith(1, 0, 100);
    expect(sound.play).not.toHaveBeenCalled();
    vi.advanceTimersByTime(99);
    expect(sound.play).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);

    expect(sound.play).not.toHaveBeenCalled();
    expect(manager.mapVolume()).toBe(0);
    vi.advanceTimersByTime(16);

    expect(mapSound.volume).toHaveBeenCalledWith(0);
    expect(sound.play).toHaveBeenCalledTimes(1);
    expect(sound.fade).toHaveBeenCalledWith(0, 0.7, 100);
  });

  it("cancels a pending exit when combat resumes", async () => {
    vi.useFakeTimers();
    const sound = createSound();
    const manager = new RpgMusicManager({
      getSound: vi.fn(() => sound),
      createSound: vi.fn(),
    });

    await manager.enter("battle", { fadeInMs: 0 });
    manager.leave({ exitDelayMs: 100, fadeOutMs: 50 });
    await manager.enter("battle", { fadeInMs: 0 });
    vi.advanceTimersByTime(200);

    expect(sound.stop).not.toHaveBeenCalled();
    expect(manager.overrideId).toBe("battle");
  });

  it("restores map music after the configured exit delay", async () => {
    vi.useFakeTimers();
    const mapSound = createSound();
    const sound = createSound();
    const manager = new RpgMusicManager({
      getSound: vi.fn(() => sound),
      createSound: vi.fn(() => mapSound),
    });

    await manager.setMap("map.mp3");
    await manager.enter("battle", { fadeInMs: 0 });
    manager.leave({ exitDelayMs: 100, fadeOutMs: 50 });
    vi.advanceTimersByTime(220);

    expect(sound.stop).toHaveBeenCalledOnce();
    expect(mapSound.fade).toHaveBeenCalledWith(0, 1, 50);
    expect(manager.mapVolume()).toBe(1);
  });

  it("replaces the owned map track without leaving the previous Howl playing", async () => {
    const first = createSound();
    const second = createSound();
    const create = vi.fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second);
    const manager = new RpgMusicManager({
      getSound: vi.fn(),
      createSound: create,
    });

    await manager.setMap("first.mp3");
    await manager.setMap("second.mp3");

    expect(first.stop).toHaveBeenCalledOnce();
    expect(second.play).toHaveBeenCalledOnce();
  });

  it("keeps the owned map track when Action Battle resets its override state", async () => {
    const mapSound = createSound();
    const battleSound = createSound();
    const manager = new RpgMusicManager({
      getSound: vi.fn(() => battleSound),
      createSound: vi.fn(() => mapSound),
    });

    await manager.setMap("map.mp3");
    await manager.enter("battle", { fadeInMs: 0 });
    manager.resetOverride();

    expect(battleSound.stop).toHaveBeenCalledOnce();
    expect(mapSound.stop).not.toHaveBeenCalled();
    expect(mapSound.volume).toHaveBeenLastCalledWith(1);
  });

  it("keeps a new output gain when the map fade completes", async () => {
    vi.useFakeTimers();
    const mapSound = createSound();
    const battleSound = createSound();
    const manager = new RpgMusicManager({
      getSound: vi.fn(() => battleSound),
      createSound: vi.fn(() => mapSound),
    });

    manager.setMap("map.mp3");
    await manager.enter("battle", { fadeInMs: 0 });
    manager.leave({ exitDelayMs: 0, fadeOutMs: 100 });
    vi.advanceTimersByTime(1);
    manager.setOutputGain(0.4);
    vi.advanceTimersByTime(200);

    expect(mapSound.volume).toHaveBeenLastCalledWith(0.4);
  });
});
