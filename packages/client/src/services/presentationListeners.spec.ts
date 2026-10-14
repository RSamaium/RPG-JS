import { describe, expect, it, vi } from "vitest";
import { normalizeWeatherPacket, registerPresentationListeners, unwrapStatePacket } from "./presentationListeners";

describe("presentation packets", () => {
  it("unwraps state packets", () => {
    expect(unwrapStatePacket({ value: 1 })).toBe(1);
    expect(unwrapStatePacket(2)).toBe(2);
  });

  it("normalizes weather packets", () => {
    expect(normalizeWeatherPacket({ value: null })).toBeNull();
    expect(normalizeWeatherPacket({})).toBeUndefined();
    expect(normalizeWeatherPacket({ effect: "" })).toBeUndefined();
    expect(normalizeWeatherPacket(undefined)).toBeUndefined();
    // Custom weather ids and presets are forwarded: the scene decides what it can draw.
    expect(normalizeWeatherPacket({ effect: "aurora", params: { intensity: 0.8 }, seed: 4 })).toMatchObject({ effect: "aurora", params: { intensity: 0.8 }, seed: 4 });
    expect(normalizeWeatherPacket({ preset: "moonbeams" })).toMatchObject({ effect: undefined, preset: "moonbeams" });
    expect(normalizeWeatherPacket({ value: { effect: "rain", params: { speed: 2 }, extra: true } })).toEqual({
      effect: "rain",
      preset: undefined,
      params: { speed: 2 },
      transitionMs: undefined,
      durationMs: undefined,
      startedAt: undefined,
      seed: undefined,
    });
  });

  it("routes presentation packets to the engine", () => {
    const handlers = new Map<string, (data: any) => void>();
    const socket = { on: (event: string, cb: (data: any) => void) => handlers.set(event, cb) } as any;
    const weatherState = { set: vi.fn() };
    const engine = {
      scene: { weatherState, lightingState: { set: vi.fn() }, getObjectById: vi.fn() },
      getComponentAnimation: vi.fn(),
      playSound: vi.fn(),
      stopSound: vi.fn(),
      stopAllSounds: vi.fn(),
      setCameraFollow: vi.fn(),
      mapShakeTrigger: { start: vi.fn() },
    } as any;

    registerPresentationListeners(socket, engine);

    handlers.get("playSound")!({ soundId: "hit", volume: 0.5, loop: false });
    handlers.get("weatherState")!({});
    handlers.get("weatherState")!(null);
    handlers.get("shakeMap")!({ intensity: 3 });

    expect(engine.playSound).toHaveBeenCalledWith("hit", { volume: 0.5, loop: false });
    expect(weatherState.set).toHaveBeenCalledTimes(1);
    expect(weatherState.set).toHaveBeenCalledWith(null);
    expect(engine.mapShakeTrigger.start).toHaveBeenCalledWith({
      intensity: 3,
      duration: undefined,
      frequency: undefined,
      direction: undefined,
    });
  });
});
