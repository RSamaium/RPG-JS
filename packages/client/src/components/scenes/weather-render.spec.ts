import { describe, expect, it, vi } from "vitest";
import { resolveWeatherRender } from "./weather-render";

const options = (custom: string[] = [], presets: string[] = ["moonbeams", "sandstorm", "lightRain"]) => ({
  customIds: new Set(custom),
  hasPreset: (name: string) => presets.includes(name),
  warn: vi.fn(),
});

describe("resolveWeatherRender", () => {
  it("renders nothing without a weather", () => {
    expect(resolveWeatherRender(null, options())).toBeNull();
    expect(resolveWeatherRender(undefined, options())).toBeNull();
  });

  it("keeps the built-in effects and their params as they were", () => {
    const render = resolveWeatherRender({ effect: "rain", params: { speed: 2, density: 150 } }, options());
    expect(render).toEqual({ kind: "builtin", props: { speed: 2, density: 150, effect: "rain", zIndex: 1000 } });
    expect(resolveWeatherRender({ effect: "rain", params: { zIndex: 5, alpha: 0.5 } }, options())).toEqual({
      kind: "builtin",
      props: { zIndex: 5, alpha: 0.5, effect: "rain" },
    });
  });

  it("forwards a preset alone, and every param, even the ones this release does not know", () => {
    const render = resolveWeatherRender({ preset: "moonbeams", params: { rayFan: 0.4, someNewParam: "x", colors: ["#fff"] } }, options());
    expect(render).toEqual({
      kind: "builtin",
      props: { rayFan: 0.4, someNewParam: "x", colors: ["#fff"], preset: "moonbeams", zIndex: 1000 },
    });
    expect(resolveWeatherRender({ effect: "embers", params: { particleSize: 1.4 } }, options())).toMatchObject({
      kind: "builtin",
      props: { effect: "embers", particleSize: 1.4 },
    });
  });

  it("renders a registered weather component with the weather state as props", () => {
    const render = resolveWeatherRender(
      { effect: "aurora", params: { intensity: 0.8 }, transitionMs: 2000, startedAt: 10, seed: 3 },
      options(["aurora"]),
    );
    expect(render).toEqual({
      kind: "custom",
      id: "aurora",
      props: { effect: "aurora", params: { intensity: 0.8 }, transitionMs: 2000, durationMs: undefined, startedAt: 10, seed: 3, zIndex: 1000 },
    });
  });

  it("lets a registered id replace a built-in effect", () => {
    expect(resolveWeatherRender({ effect: "rain" }, options(["rain"]))).toMatchObject({ kind: "custom", id: "rain" });
  });

  it("warns once about an unknown effect or preset, and renders nothing", () => {
    const opts = options();
    expect(resolveWeatherRender({ effect: "lava-x" }, opts)).toBeNull();
    expect(resolveWeatherRender({ effect: "lava-x" }, opts)).toBeNull();
    expect(opts.warn).toHaveBeenCalledTimes(1);

    const presetOpts = options();
    expect(resolveWeatherRender({ preset: "nope-x" }, presetOpts)).toBeNull();
    expect(resolveWeatherRender({ preset: "nope-x" }, presetOpts)).toBeNull();
    expect(presetOpts.warn).toHaveBeenCalledTimes(1);
  });
});
