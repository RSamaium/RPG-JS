import { describe, expect, test } from "vitest";
import type { WeatherState } from "@rpgjs/common";
import { resolveEffectiveWeather } from "./weather-state";

const snow: WeatherState = { effect: "snow", startedAt: 1 };
const rain: WeatherState = { effect: "rain", startedAt: 2 };

describe("client map weather precedence", () => {
  test("uses map data only until the synchronized state is received", () => {
    expect(resolveEffectiveWeather(null, undefined, snow)).toEqual(snow);
    expect(resolveEffectiveWeather(null, rain, snow)).toEqual(rain);
  });

  test("treats a synchronized null state as an authoritative weather clear", () => {
    expect(resolveEffectiveWeather(null, null, snow)).toBeNull();
  });

  test("keeps an explicit client-only override above synchronized weather", () => {
    expect(resolveEffectiveWeather(snow, rain, null)).toEqual(snow);
    expect(resolveEffectiveWeather(snow, null, null)).toEqual(snow);
  });
});
