import {
  withTimeManager,
  type TimeEnvironmentReason,
  type TimeState,
} from "@rpgjs/common";

export const ENVIRONMENT_HOOK_LOG_KEY = "environmentHookLog";

export interface EnvironmentHookLogEntry {
  source: "plugin" | "event";
  hook: string;
  detail: string;
  time: string;
  reason: TimeEnvironmentReason;
}

export interface EnvironmentHookLog {
  entries: EnvironmentHookLogEntry[];
}

type DemoRuntimeMap = {
  id: string;
  setSync?: (schema: Record<string, any>) => void;
  applySyncToClient?: () => void;
  [ENVIRONMENT_HOOK_LOG_KEY]?: (() => EnvironmentHookLog) & {
    set: (value: EnvironmentHookLog) => void;
  };
};

export function ensureEnvironmentHookLog(map: DemoRuntimeMap): void {
  if (typeof map[ENVIRONMENT_HOOK_LOG_KEY] === "function") {
    return;
  }
  map.setSync?.({
    [ENVIRONMENT_HOOK_LOG_KEY]: {
      $initial: { entries: [] },
      $syncWithClient: true,
      $permanent: false,
    },
  });
}

export function pushEnvironmentHookLog(
  map: DemoRuntimeMap,
  entry: Omit<EnvironmentHookLogEntry, "time"> & { time: TimeState },
): void {
  ensureEnvironmentHookLog(map);
  const signal = map[ENVIRONMENT_HOOK_LOG_KEY];
  if (!signal) {
    return;
  }
  const current = signal()?.entries ?? [];
  signal.set({
    entries: [
      {
        ...entry,
        time: formatTime(entry.time),
      },
      ...current,
    ].slice(0, 6),
  });
  map.applySyncToClient?.();
}

function formatTime(time: TimeState): string {
  return `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")} D${time.day}`;
}

export const timeManagerModule = withTimeManager({
  start: "0001-01-01 07:45",
  scale: 2000,
  calendar: {
    months: 12,
    daysPerMonth: 30,
    daysPerWeek: 7,
    seasons: ["spring", "summer", "autumn", "winter"],
  },
  lighting: {
    enabled: true,
    transitionMs: 900,
    phases: {
      dawn: { hour: 6, lighting: { ambient: { darkness: 0.16 }, sun: { intensity: 0.55 } } },
      day: { hour: 8, lighting: { ambient: { darkness: 0 }, sun: { intensity: 1 } } },
      dusk: { hour: 18, lighting: { ambient: { darkness: 0.34 }, sun: { intensity: 0.45 } } },
      night: { hour: 21, lighting: { ambient: { darkness: 0.62 }, sun: { intensity: 0.18 } } },
    },
  },
  weather: {
    enabled: true,
    maps: {
      "time-manager-map": {
        ambiences: {
          clear: {
            weather: null,
            weight: { default: 45, months: { 6: 70, 7: 75, 8: 70 } },
            duration: { hours: 1 },
          },
          cloud: {
            weather: {
              effect: "cloud",
              preset: "slowClouds",
              params: {
                density: 0.68,
                speed: 0.2,
                alpha: 0.45,
              },
              transitionMs: 700,
            },
            weight: { default: 30, seasons: { autumn: 40, winter: 35 } },
            duration: { hours: 1 },
          },
          rain: {
            weather: {
              effect: "rain",
              preset: "demoRain",
              params: {
                density: 190,
                speed: 0.85,
                windStrength: 0.2,
              },
              transitionMs: 700,
            },
            weight: { default: 15, months: { 3: 45, 4: 50, 10: 40, 11: 45 } },
            duration: { min: { hours: 1 }, max: { hours: 2 } },
          },
          fog: {
            weather: {
              effect: "fog",
              preset: "demoFog",
              params: {
                density: 0.85,
                alpha: 0.55,
                height: 0.7,
              },
              transitionMs: 700,
            },
            weight: { default: 10, seasons: { autumn: 25, winter: 20 } },
            duration: { hours: 1 },
          },
        },
      },
    },
  },
  hooks: {
    onDayChange({ map, current, reason }) {
      pushEnvironmentHookLog(map as DemoRuntimeMap, {
        source: "plugin",
        hook: "onDayChange",
        detail: `day ${current.day}`,
        time: current,
        reason,
      });
    },
    onLightingPhaseChange({ map, previousKey, currentKey, time, reason }) {
      pushEnvironmentHookLog(map as DemoRuntimeMap, {
        source: "plugin",
        hook: "onLightingPhaseChange",
        detail: `${previousKey} -> ${currentKey}`,
        time,
        reason,
      });
    },
    onBeforeWeatherChange({ map, candidate, time, reason }) {
      pushEnvironmentHookLog(map as DemoRuntimeMap, {
        source: "plugin",
        hook: "onBeforeWeatherChange",
        detail: `roll ${candidate.key}`,
        time,
        reason,
      });
    },
    onWeatherChange({ map, previousKey, currentKey, time, reason }) {
      pushEnvironmentHookLog(map as DemoRuntimeMap, {
        source: "plugin",
        hook: "onWeatherChange",
        detail: `${previousKey ?? "none"} -> ${currentKey}`,
        time,
        reason,
      });
    },
  },
});
