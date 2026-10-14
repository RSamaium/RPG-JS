import { describe, expect, it } from "vitest";
import { WEATHER_PARTICLE_EFFECTS, WEATHER_PRESETS, getWeatherPreset } from "@canvasengine/presets";
import {
  WEATHER_EFFECTS,
  WEATHER_PRESET_EFFECTS,
  WEATHER_PRESET_NAMES,
  getWeatherPresetEffect,
  resolveWeatherEffect,
} from "@rpgjs/common";

// `@rpgjs/common` keeps a copy of the CanvasEngine catalog so it never imports the renderer:
// this is the guard against it drifting when `@canvasengine/presets` is upgraded.
describe("weather catalog of @rpgjs/common", () => {
  it("lists every effect of CanvasEngine", () => {
    expect([...WEATHER_EFFECTS].sort()).toEqual(["rain", "snow", "fog", "cloud", "rays", ...WEATHER_PARTICLE_EFFECTS].sort());
  });

  it("lists every preset of CanvasEngine with the effect it draws", () => {
    const real: Record<string, string> = {};
    for (const group of Object.values(WEATHER_PRESETS as Record<string, Record<string, { effect: string }>>)) {
      for (const [name, preset] of Object.entries(group)) real[name] = preset.effect;
    }
    expect({ ...WEATHER_PRESET_EFFECTS }).toEqual(real);
    expect(WEATHER_PRESET_NAMES.sort()).toEqual(Object.keys(real).sort());
    for (const name of WEATHER_PRESET_NAMES) expect(getWeatherPreset(name)).toBeDefined();
  });

  it("resolves the effect of a state from its own effect, else from its preset", () => {
    expect(getWeatherPresetEffect("moonbeams")).toBe("rays");
    expect(getWeatherPresetEffect("toString")).toBeUndefined();
    expect(resolveWeatherEffect({ preset: "sandstorm" })).toBe("sand");
    expect(resolveWeatherEffect({ effect: "aurora", preset: "sandstorm" })).toBe("aurora");
    expect(resolveWeatherEffect({ preset: "unknown" })).toBeUndefined();
    expect(resolveWeatherEffect(null)).toBeUndefined();
  });
});
