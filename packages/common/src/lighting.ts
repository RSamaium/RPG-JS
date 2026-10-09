export type LightingColor = string | number | [number, number, number];

export interface LightingAmbient {
  darkness?: number;
  darkColor?: LightingColor;
  fogColor?: LightingColor;
  fogRadius?: number;
  fogSoftness?: number;
  fogOpacity?: number;
}

export interface LightSpot {
  id?: string;
  x: number;
  y: number;
  radius?: number;
  intensity?: number;
  color?: LightingColor;
  flicker?: boolean;
  flickerSpeed?: number;
  pulse?: boolean;
  pulseSpeed?: number;
  phase?: number;
  /** Glow of the light in the air, `0` to `1`. Used by the day night cycle. */
  halo?: number;
  /** Hours `[on, off]` the light is on (it may cross midnight). Used by the day night cycle. */
  schedule?: [number, number];
}

/**
 * Day night cycle of a map: the scene is color graded by the hour of an in-game clock and the light spots
 * are lit when it is dark (or on their own schedule). It replaces the darkness overlay of `ambient`.
 */
export interface LightingDayNight {
  enabled?: boolean;
  /** Hour the clock starts at, `0` to `24` (decimals are minutes: `18.5` = 18:30). */
  time?: number;
  /** Game minutes elapsed per real second. */
  speed?: number;
  paused?: boolean;
  /** Multiplies every light intensity. */
  lightIntensity?: number;
  /** Multiplies the vignette. */
  vignette?: number;
}

/** A light of the `DayNightCycle` preset of `@canvasengine/presets`. */
export interface DayNightLight {
  x: number;
  y: number;
  radius: number;
  color?: LightingColor;
  intensity?: number;
  halo?: number;
  flicker: number;
  schedule?: [number, number];
}

export interface LightingSun {
  x?: number;
  y?: number;
  z?: number;
  radius?: number;
  intensity?: number;
  shadowWeight?: number;
  enabled?: boolean;
}

export interface LightingAmbientLight {
  x: number;
  y: number;
  z?: number;
  intensity?: number;
  shadowWeight?: number;
  length?: number;
  enabled?: boolean;
}

export interface LightingShadows {
  enabled?: boolean;
  mode?: "strongest" | "blend2";
  updateHz?: number;
  scanHz?: number;
  cullToViewport?: boolean;
  minInfluence?: number;
  falloffPower?: number;
  ambientLight?: LightingAmbientLight | null;
  shadowColor?: LightingColor;
}

export interface LightingState {
  ambient?: LightingAmbient;
  spots?: LightSpot[];
  sun?: LightingSun;
  shadows?: LightingShadows;
  dayNight?: LightingDayNight;
}

export interface LightingTransitionOptions {
  duration?: number;
  easing?: "linear" | "easeInOut";
}

export function hasActiveLightingSun(lighting: LightingState | null | undefined): boolean {
  const sun = lighting?.sun;
  if (!sun || sun.enabled === false) {
    return false;
  }
  return (sun.intensity ?? 1) > 0;
}

export function hasActiveLightingDayNight(lighting: LightingState | null | undefined): boolean {
  return lighting?.dayNight?.enabled === true;
}

/** Reach of a light spot in the day night cycle, in world pixels, from the radius of the spot. */
const DAY_NIGHT_SPOT_RADIUS_SCALE = 3.5;
const DAY_NIGHT_SPOT_MIN_RADIUS = 120;
/** Strength of the flame flicker of a spot that flickers, `0` to `1`. */
const DAY_NIGHT_FLICKER = 0.2;

export function toDayNightLights(spots: LightSpot[] | null | undefined): DayNightLight[] {
  return (spots ?? []).map((spot) => {
    const schedule = Array.isArray(spot.schedule) && spot.schedule.length === 2
      && spot.schedule.every((hour) => Number.isFinite(Number(hour)))
      ? ([Number(spot.schedule[0]), Number(spot.schedule[1])] as [number, number])
      : undefined;
    return {
      x: spot.x,
      y: spot.y,
      radius: Math.max((spot.radius ?? 180) * DAY_NIGHT_SPOT_RADIUS_SCALE, DAY_NIGHT_SPOT_MIN_RADIUS),
      ...(spot.color !== undefined ? { color: spot.color } : {}),
      ...(spot.intensity !== undefined ? { intensity: spot.intensity } : {}),
      ...(spot.halo !== undefined ? { halo: spot.halo } : {}),
      flicker: spot.flicker ? DAY_NIGHT_FLICKER : 0,
      ...(schedule ? { schedule } : {}),
    };
  });
}

export function hasAutoLightingSunShadows(lighting: LightingState | null | undefined): boolean {
  return Boolean(hasActiveLightingSun(lighting) && lighting?.shadows?.enabled !== false);
}

export function shouldRenderLightingShadows(lighting: LightingState | null | undefined): boolean {
  return Boolean(
    lighting?.shadows?.enabled ||
      (lighting?.spots?.length ?? 0) > 0 ||
      hasAutoLightingSunShadows(lighting)
  );
}

export const DEFAULT_DAY_LIGHTING: LightingState = {
  ambient: {
    darkness: 0,
    darkColor: "#000000",
    fogColor: "#141424",
    fogOpacity: 0.35,
  },
  sun: {
    intensity: 1,
    enabled: true,
  },
  shadows: {
    enabled: false,
    mode: "strongest",
    updateHz: 30,
    shadowColor: "#05070d",
  },
};

export const DEFAULT_NIGHT_LIGHTING: LightingState = {
  ambient: {
    darkness: 0.45,
    darkColor: "#0a1020",
    fogColor: "#141a2a",
    fogOpacity: 0.35,
  },
  sun: {
    intensity: 0.35,
    enabled: true,
  },
  shadows: {
    enabled: true,
    mode: "strongest",
    updateHz: 30,
    shadowColor: "#05070d",
  },
};

export function cloneLightingState(lighting: LightingState | null | undefined): LightingState | null {
  if (!lighting) {
    return null;
  }
  return {
    ...lighting,
    ambient: lighting.ambient ? { ...lighting.ambient } : undefined,
    spots: lighting.spots ? lighting.spots.map((spot) => ({ ...spot })) : undefined,
    sun: lighting.sun ? { ...lighting.sun } : undefined,
    shadows: lighting.shadows ? { ...lighting.shadows } : undefined,
    dayNight: lighting.dayNight ? { ...lighting.dayNight } : undefined,
  };
}

export function mergeLightingState(
  current: LightingState | null | undefined,
  patch: Partial<LightingState>
): LightingState {
  return {
    ...(current ?? {}),
    ...patch,
    ambient: patch.ambient
      ? {
          ...(current?.ambient ?? {}),
          ...patch.ambient,
        }
      : current?.ambient,
    spots: patch.spots ? patch.spots.map((spot) => ({ ...spot })) : current?.spots?.map((spot) => ({ ...spot })),
    sun: patch.sun
      ? {
          ...(current?.sun ?? {}),
          ...patch.sun,
        }
      : current?.sun,
    shadows: patch.shadows
      ? {
          ...(current?.shadows ?? {}),
          ...patch.shadows,
        }
      : current?.shadows,
    dayNight: patch.dayNight
      ? {
          ...(current?.dayNight ?? {}),
          ...patch.dayNight,
        }
      : current?.dayNight,
  };
}

export function normalizeLightingState(value: unknown): LightingState | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as LightingState;
  const next: LightingState = {};

  if (raw.ambient && typeof raw.ambient === "object") {
    next.ambient = { ...raw.ambient };
  }
  if (Array.isArray(raw.spots)) {
    next.spots = raw.spots
      .filter((spot): spot is LightSpot => {
        return !!spot
          && typeof spot === "object"
          && Number.isFinite(Number((spot as LightSpot).x))
          && Number.isFinite(Number((spot as LightSpot).y));
      })
      .map((spot) => ({
        ...spot,
        x: Number(spot.x),
        y: Number(spot.y),
      }));
  }
  if (raw.sun && typeof raw.sun === "object") {
    next.sun = { ...raw.sun };
  }
  if (raw.shadows && typeof raw.shadows === "object") {
    next.shadows = { ...raw.shadows };
  }
  if (raw.dayNight && typeof raw.dayNight === "object") {
    next.dayNight = { ...raw.dayNight };
  }

  return Object.keys(next).length > 0 ? next : null;
}
