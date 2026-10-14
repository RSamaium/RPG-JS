/**
 * Weather effects drawn by CanvasEngine (`@canvasengine/presets`).
 *
 * The list is a plain copy so that `@rpgjs/common`, which also runs on the
 * server, never imports the renderer. A client test checks it against the
 * installed `@canvasengine/presets`.
 */
export const WEATHER_EFFECTS = [
  "rain",
  "snow",
  "fog",
  "cloud",
  "rays",
  "embers",
  "ash",
  "leaves",
  "petals",
  "fireflies",
  "spores",
  "sand",
] as const;

export type BuiltInWeatherEffect = (typeof WEATHER_EFFECTS)[number];

/**
 * A CanvasEngine effect, or the id of a weather component registered with the
 * client `weathers` module option.
 */
export type WeatherEffect = BuiltInWeatherEffect | (string & {});

/** Effect drawn by each CanvasEngine weather preset (`WEATHER_PRESETS` of `@canvasengine/presets`). */
export const WEATHER_PRESET_EFFECTS = {
  lightRain: "rain",
  steadyRain: "rain",
  stormRain: "rain",
  lightSnow: "snow",
  winterSnow: "snow",
  blizzardSnow: "snow",
  rpgMorningMist: "fog",
  rpgForestFog: "fog",
  rpgSwampFog: "fog",
  rpgNightFog: "fog",
  rpgHeavyFog: "fog",
  lightClouds: "cloud",
  overcastClouds: "cloud",
  stormClouds: "cloud",
  goldenHourRays: "cloud",
  sunnySoftRays: "cloud",
  sunsetTwinkleRays: "cloud",
  dramaticCrepuscularRays: "cloud",
  morningHazeRays: "cloud",
  naturalClouds: "cloud",
  morningSunRays: "rays",
  goldenHourShafts: "rays",
  forestLightShafts: "rays",
  moonbeams: "rays",
  holyRays: "rays",
  radiantBeams: "rays",
  volcanoEmbers: "embers",
  eruptionEmbers: "embers",
  ashfall: "ash",
  autumnLeaves: "leaves",
  autumnGust: "leaves",
  sakuraPetals: "petals",
  sakuraStorm: "petals",
  summerFireflies: "fireflies",
  swampFireflies: "fireflies",
  forestSpores: "spores",
  enchantedSpores: "spores",
  dustWind: "sand",
  sandstorm: "sand",
} as const satisfies Record<string, BuiltInWeatherEffect>;

export type WeatherPresetName = keyof typeof WEATHER_PRESET_EFFECTS;

export const WEATHER_PRESET_NAMES = Object.keys(WEATHER_PRESET_EFFECTS) as WeatherPresetName[];

/** The effect drawn by a CanvasEngine preset, or `undefined` for an unknown name. */
export function getWeatherPresetEffect(name: string): BuiltInWeatherEffect | undefined {
  return Object.prototype.hasOwnProperty.call(WEATHER_PRESET_EFFECTS, name)
    ? WEATHER_PRESET_EFFECTS[name as WeatherPresetName]
    : undefined;
}

/** The effect of a weather state: its own `effect`, else the one of its `preset`. */
export function resolveWeatherEffect(state: { effect?: string; preset?: string } | null | undefined): string | undefined {
  if (!state) return undefined;
  if (typeof state.effect === "string" && state.effect) return state.effect;
  return typeof state.preset === "string" ? getWeatherPresetEffect(state.preset) : undefined;
}

/**
 * Known parameters, forwarded to CanvasEngine `<Weather>`. The type is open: any
 * other parameter of a CanvasEngine release, or of a custom weather component,
 * is forwarded unchanged.
 */
export interface KnownWeatherParams {
  speed?: number;
  windDirection?: number;
  windStrength?: number;
  density?: number;
  maxDrops?: number;
  height?: number;
  scale?: number;
  sunIntensity?: number;
  sunAngle?: number;
  raySpread?: number;
  rayTwinkle?: number;
  rayTwinkleSpeed?: number;
  rayFan?: number;
  rayLength?: number;
  rayDust?: number;
  rayColor?: string;
  fogOpacity?: number;
  fogSoftness?: number;
  cloudOpacity?: number;
  cloudAltitude?: number;
  shadowIntensity?: number;
  shadowSoftness?: number;
  colors?: string[];
  particleSize?: number;
  haze?: number;
  topDown?: boolean;
  zIndex?: number;
  alpha?: number;
  blendMode?: string;
}

export type WeatherParams = KnownWeatherParams & Record<string, unknown>;

export interface WeatherState {
  /** Built-in effect or custom weather id. Optional when a `preset` gives it. */
  effect?: WeatherEffect;
  /** A CanvasEngine preset (`moonbeams`, `sandstorm`, ...). `params` override its values. */
  preset?: string;
  params?: WeatherParams;
  transitionMs?: number;
  durationMs?: number;
  startedAt?: number;
  seed?: number;
}
