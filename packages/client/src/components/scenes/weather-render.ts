import { WEATHER_EFFECTS, type WeatherState } from "@rpgjs/common";

export const DEFAULT_WEATHER_Z_INDEX = 1000;

export type WeatherRender =
  | { kind: "builtin"; props: Record<string, unknown> }
  | { kind: "custom"; id: string; props: Record<string, unknown> };

export interface WeatherRenderOptions {
  /** Ids of the weather components registered with the `weathers` module option. */
  customIds: { has(id: string): boolean };
  /** Whether CanvasEngine knows this preset name. */
  hasPreset: (name: string) => boolean;
  warn?: (message: string) => void;
}

const warned = new Set<string>();

function warnOnce(options: WeatherRenderOptions, key: string, message: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  (options.warn ?? console.warn)(message);
}

/**
 * Decides what a weather state draws: a registered custom component (which also
 * replaces a built-in effect of the same name), CanvasEngine's `<Weather>` with
 * the preset and every param forwarded as they are, or nothing for an unknown
 * effect or preset (warned once, never thrown).
 */
export function resolveWeatherRender(state: WeatherState | null | undefined, options: WeatherRenderOptions): WeatherRender | null {
  if (!state) return null;
  const params = state.params ?? {};
  const zIndex = typeof params.zIndex === "number" ? params.zIndex : DEFAULT_WEATHER_Z_INDEX;
  const effect = typeof state.effect === "string" && state.effect ? state.effect : undefined;
  const preset = typeof state.preset === "string" && state.preset ? state.preset : undefined;

  if (effect && options.customIds.has(effect)) {
    return {
      kind: "custom",
      id: effect,
      props: {
        effect,
        params,
        transitionMs: state.transitionMs,
        durationMs: state.durationMs,
        startedAt: state.startedAt,
        seed: state.seed,
        zIndex,
      },
    };
  }

  if (preset && !options.hasPreset(preset)) {
    warnOnce(options, `preset:${preset}`, `Weather: unknown preset "${preset}", nothing is rendered.`);
    return null;
  }
  if (effect && !(WEATHER_EFFECTS as readonly string[]).includes(effect)) {
    warnOnce(options, `effect:${effect}`, `Weather: unknown effect "${effect}". Register it with the "weathers" module option.`);
    return null;
  }
  if (!effect && !preset) return null;

  return {
    kind: "builtin",
    props: {
      ...params,
      ...(effect ? { effect } : {}),
      ...(preset ? { preset } : {}),
      zIndex,
    },
  };
}
