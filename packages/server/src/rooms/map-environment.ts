import type { LightingState, LightingTransitionOptions, WeatherState } from "@rpgjs/common";

export function cloneWeatherState(weather: WeatherState | null): WeatherState | null {
  if (!weather) {
    return null;
  }
  return {
    ...weather,
    params: weather.params ? { ...weather.params } : undefined,
  };
}

export function interpolateNumber(from: number | undefined, to: number | undefined, progress: number): number | undefined {
  if (typeof from !== "number" && typeof to !== "number") {
    return undefined;
  }
  const start = typeof from === "number" ? from : 0;
  const end = typeof to === "number" ? to : start;
  return start + (end - start) * progress;
}

export function easeLightingProgress(progress: number, easing: LightingTransitionOptions["easing"]): number {
  const value = Math.max(0, Math.min(1, progress));
  if (easing === "easeInOut") {
    return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
  }
  return value;
}

export function interpolateLighting(from: LightingState, to: LightingState, progress: number): LightingState {
  return {
    ...to,
    ambient: {
      ...(to.ambient ?? {}),
      darkness: interpolateNumber(from.ambient?.darkness, to.ambient?.darkness, progress),
      fogRadius: interpolateNumber(from.ambient?.fogRadius, to.ambient?.fogRadius, progress),
      fogSoftness: interpolateNumber(from.ambient?.fogSoftness, to.ambient?.fogSoftness, progress),
      fogOpacity: interpolateNumber(from.ambient?.fogOpacity, to.ambient?.fogOpacity, progress),
    },
    sun: {
      ...(to.sun ?? {}),
      x: interpolateNumber(from.sun?.x, to.sun?.x, progress),
      y: interpolateNumber(from.sun?.y, to.sun?.y, progress),
      z: interpolateNumber(from.sun?.z, to.sun?.z, progress),
      radius: interpolateNumber(from.sun?.radius, to.sun?.radius, progress),
      intensity: interpolateNumber(from.sun?.intensity, to.sun?.intensity, progress),
      shadowWeight: interpolateNumber(from.sun?.shadowWeight, to.sun?.shadowWeight, progress),
    },
  };
}
