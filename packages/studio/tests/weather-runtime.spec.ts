import { describe, expect, test } from "vitest";
import { weatherStateSchema } from "../runtime/schemas/weather";
import { mergeWeatherState, normalizeWeatherState, toCanvasWeatherOptions } from "../runtime/weather";

describe("Studio weather runtime", () => {
  test("keeps fog parameters used by the CanvasEngine Weather preset", () => {
    expect(
      toCanvasWeatherOptions({
        effect: "fog",
        preset: "rpgMorningMist",
        params: {
          density: 0.75,
          speed: 0.16,
          windDirection: 0,
          windStrength: 0.2,
          maxDrops: 80,
          scale: 1.35,
          height: 0.45,
          opacity: 0.7,
          sunIntensity: 0,
          sunAngle: 0.9,
          raySpread: 1,
          rayTwinkle: 0,
          rayTwinkleSpeed: 1,
        },
        transitionMs: 0,
        startedAt: 1778053341493,
      })
    ).toMatchObject({
      effect: "fog",
      density: 0.75,
      speed: 0.16,
      scale: 1.35,
      height: 0.45,
      alpha: 0.7,
      zIndex: 1000,
    });
  });

  test("keeps cloud as a CanvasEngine weather effect", () => {
    expect(
      toCanvasWeatherOptions({
        effect: "cloud",
        preset: "goldenHourRays",
        params: {
          sunIntensity: 1,
          rayTwinkle: 0.5,
        },
      })
    ).toMatchObject({
      effect: "cloud",
      sunIntensity: 1,
      rayTwinkle: 0.5,
    });
  });

  test("does not let an incompatible preset override the selected effect", () => {
    expect(
      normalizeWeatherState({
        effect: "snow",
        preset: "rpgMorningMist",
        params: {
          density: 150,
        },
      })
    ).toMatchObject({
      effect: "snow",
      preset: undefined,
      params: {
        density: 150,
      },
    });
  });

  test("drops the previous preset when patching to another effect", () => {
    expect(
      mergeWeatherState(
        {
          effect: "fog",
          preset: "rpgMorningMist",
          params: {
            density: 0.75,
          },
        },
        {
          effect: "snow",
          params: {
            density: 150,
          },
        }
      )
    ).toMatchObject({
      effect: "snow",
      preset: undefined,
      params: {
        density: 150,
      },
    });
  });

  test("generates preset labels and filters presets by effect in Studio schema", () => {
    const snowRule = weatherStateSchema.allOf.find((rule: any) => {
      return rule.if?.properties?.effect?.const === "snow";
    }) as any;
    const snowPreset = snowRule.then.properties.preset;

    expect(snowPreset.enum).toEqual(["custom", "lightSnow", "winterSnow", "blizzardSnow"]);
    expect(snowPreset.format.labels).toEqual(["Custom", "Light Snow", "Winter Snow", "Blizzard Snow"]);
    expect(snowPreset.enum).not.toContain("rpgMorningMist");
  });
});

describe("extra weather effects and presets", () => {
  test("resolves a preset of an ambient effect with the params it sets", () => {
    const state = normalizeWeatherState({ preset: "swampFireflies" }, 1);
    expect(state?.effect).toBe("fireflies");
    expect(state?.params).toMatchObject({ density: 200, maxDrops: 110, colors: ["#b8ff7a", "#7affc8", "#e8ff8a"] });
    expect(normalizeWeatherState({ preset: "moonbeams" }, 1)).toMatchObject({
      effect: "rays",
      params: { sunIntensity: 0.75, rayFan: 0.15, rayColor: "#b8d4ff" },
    });
    expect(normalizeWeatherState({ effect: "lava" })).toBeNull();
  });

  test("keeps the output of a former preset free of extra params", () => {
    expect(Object.keys(normalizeWeatherState({ preset: "steadyRain" }, 1)!.params!)).toHaveLength(13);
  });

  test("hands the extra params of an effect to the renderer, and nothing for the others", () => {
    const fireflies = toCanvasWeatherOptions(normalizeWeatherState({ preset: "swampFireflies" }, 1)!);
    expect(fireflies).toMatchObject({ effect: "fireflies", density: 200, maxDrops: 110, colors: ["#b8ff7a", "#7affc8", "#e8ff8a"] });
    const sand = toCanvasWeatherOptions(normalizeWeatherState({ preset: "sandstorm" }, 1)!);
    expect(sand).toMatchObject({ effect: "sand", density: 320, haze: 1.6 });
    expect(toCanvasWeatherOptions(normalizeWeatherState({ preset: "steadyRain" }, 1)!)).not.toHaveProperty("colors");
  });

  test("clamps and filters the extra params", () => {
    const params = normalizeWeatherState({ preset: "custom", effect: "rays", params: { rayFan: 9, rayColor: "red", colors: ["#fff", 3], sunIntensity: 2 } }, 1)!.params!;
    expect(params).toMatchObject({ rayFan: 1, sunIntensity: 2, colors: ["#fff"] });
    expect(params).not.toHaveProperty("rayColor");
  });

  test("switches to the effect of a new preset when merging", () => {
    const rain = normalizeWeatherState({ preset: "steadyRain" }, 1);
    expect(mergeWeatherState(rain, { preset: "holyRays" }, 2)).toMatchObject({ effect: "rays", params: { rayFan: 0.9 } });
  });
});
