import { describe, expect, it } from "vitest";
import {
  DEFAULT_DAY_LIGHTING,
  cloneLightingState,
  hasActiveLightingDayNight,
  hasActiveLightingSun,
  mergeLightingState,
  normalizeLightingState,
  toDayNightLights,
  hasAutoLightingSunShadows,
  shouldRenderLightingShadows,
} from "./lighting";

describe("lighting shadow helpers", () => {
  it("detects active sun only when a sun is configured and enabled", () => {
    expect(hasActiveLightingSun(null)).toBe(false);
    expect(hasActiveLightingSun({ sun: { intensity: 0.9 } })).toBe(true);
    expect(hasActiveLightingSun({ sun: { intensity: 0 } })).toBe(false);
    expect(hasActiveLightingSun({ sun: { enabled: false, intensity: 1 } })).toBe(false);
  });

  it("enables automatic sun shadows unless shadows are explicitly disabled", () => {
    expect(hasAutoLightingSunShadows({ sun: { intensity: 0.95 } })).toBe(true);
    expect(hasAutoLightingSunShadows({ sun: { intensity: 0.95 }, shadows: { enabled: true } })).toBe(true);
    expect(hasAutoLightingSunShadows({ sun: { intensity: 0.95 }, shadows: { enabled: false } })).toBe(false);
  });

  it("keeps light spots as shadow triggers even when automatic sun shadows are disabled", () => {
    expect(shouldRenderLightingShadows({ spots: [{ x: 10, y: 20 }], shadows: { enabled: false } })).toBe(true);
    expect(shouldRenderLightingShadows({ sun: { intensity: 0.95 }, shadows: { enabled: false } })).toBe(false);
    expect(shouldRenderLightingShadows({ sun: { intensity: 0.95 } })).toBe(true);
    expect(shouldRenderLightingShadows(DEFAULT_DAY_LIGHTING)).toBe(false);
  });
});

describe("lighting day night cycle", () => {
  it("is active only when the cycle is enabled", () => {
    expect(hasActiveLightingDayNight(null)).toBe(false);
    expect(hasActiveLightingDayNight({})).toBe(false);
    expect(hasActiveLightingDayNight({ dayNight: { enabled: false } })).toBe(false);
    expect(hasActiveLightingDayNight({ dayNight: { enabled: true } })).toBe(true);
  });

  it("keeps the cycle through normalize, clone and merge", () => {
    const dayNight = { enabled: true, time: 18.5, speed: 12, paused: false, lightIntensity: 1.2, vignette: 0.8 };

    expect(normalizeLightingState({ dayNight })?.dayNight).toEqual(dayNight);
    expect(cloneLightingState({ dayNight })?.dayNight).toEqual(dayNight);
    expect(cloneLightingState({ dayNight })?.dayNight).not.toBe(dayNight);
    expect(mergeLightingState({ dayNight }, { dayNight: { time: 22 } }).dayNight).toEqual({ ...dayNight, time: 22 });
  });

  it("turns light spots into lights of the day night cycle, with their color, halo and schedule", () => {
    const [lamp, plain] = toDayNightLights([
      { x: 10, y: 20, radius: 50, intensity: 0.9, color: "#ffcf7a", halo: 0.4, flicker: true, schedule: [19, 23.5] },
      { x: 30, y: 40 },
    ]);

    expect(lamp).toMatchObject({ x: 10, y: 20, color: "#ffcf7a", halo: 0.4, schedule: [19, 23.5], intensity: 0.9 });
    expect(lamp.radius).toBeGreaterThan(50);
    expect(lamp.flicker).toBeGreaterThan(0);
    expect(plain).toMatchObject({ x: 30, y: 40, flicker: 0 });
    expect(plain.radius).toBeGreaterThan(0);
    expect(plain).not.toHaveProperty("schedule");
    expect(plain).not.toHaveProperty("color");
  });

  it("ignores a schedule that is not two hours", () => {
    expect(toDayNightLights([{ x: 0, y: 0, schedule: [19] as unknown as [number, number] }])[0]).not.toHaveProperty("schedule");
  });
});
