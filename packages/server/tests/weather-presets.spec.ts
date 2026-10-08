import { describe, expect, it, vi } from "vitest";
import { RpgMap } from "../src/rooms/map";

// The weather methods only use these three members of the map.
function fakeMap() {
  const map: any = { _weatherState: null, $broadcast: vi.fn() };
  map.getWeather = () => RpgMap.prototype.getWeather.call(map);
  map.setWeather = (next: any, options?: any) => RpgMap.prototype.setWeather.call(map, next, options);
  map.patchWeather = (patch: any, options?: any) => RpgMap.prototype.patchWeather.call(map, patch, options);
  return map;
}

describe("map weather with presets and custom effects", () => {
  it("accepts a preset without an effect, and syncs the state unchanged", () => {
    const map = fakeMap();
    map.setWeather({ preset: "moonbeams", params: { rayFan: 0.4 } });
    expect(map.getWeather()).toEqual({ preset: "moonbeams", params: { rayFan: 0.4 } });
    expect(map.$broadcast).toHaveBeenCalledWith({ type: "weatherState", value: { preset: "moonbeams", params: { rayFan: 0.4 } } });
  });

  it("accepts a custom effect id and params it does not know", () => {
    const map = fakeMap();
    map.setWeather({ effect: "aurora", params: { intensity: 0.8 } }, { sync: false });
    expect(map.getWeather()).toEqual({ effect: "aurora", params: { intensity: 0.8 } });
    expect(map.$broadcast).not.toHaveBeenCalled();
  });

  it("still requires an effect or a preset", () => {
    const map = fakeMap();
    expect(() => map.setWeather({ params: {} })).toThrow(/effect' or 'preset/);
    expect(() => map.patchWeather({ params: {} })).toThrow(/effect' or 'preset/);
    expect(() => map.setWeather(null)).not.toThrow();
  });

  it("does not let the previous effect override the effect of a new preset", () => {
    const map = fakeMap();
    map.setWeather({ effect: "rain", params: { speed: 1 } });
    map.patchWeather({ preset: "sandstorm" });
    expect(map.getWeather()).toEqual({ preset: "sandstorm", params: { speed: 1 } });

    map.patchWeather({ effect: "snow" });
    expect(map.getWeather()).toEqual({ effect: "snow", params: { speed: 1 } });

    map.patchWeather({ params: { density: 5 } });
    expect(map.getWeather()).toEqual({ effect: "snow", params: { speed: 1, density: 5 } });
  });
});
