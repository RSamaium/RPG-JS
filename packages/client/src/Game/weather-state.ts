import type { WeatherState } from "@rpgjs/common";

export const resolveEffectiveWeather = (
  localOverride: WeatherState | null,
  synchronizedState: WeatherState | null | undefined,
  mapFallback: WeatherState | null,
): WeatherState | null => {
  if (localOverride) {
    return localOverride;
  }
  return synchronizedState === undefined ? mapFallback : synchronizedState;
};
