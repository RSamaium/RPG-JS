import type { LightingState } from "./lighting";
import type { WeatherState } from "./weather";

export const TIME_MANAGER_MODULE_KEY = "timeManager";
export const TIME_MANAGER_SYNC_KEY = "__rpgjsTime";

export interface TimeCalendarConfig {
  months: number;
  daysPerMonth: number | number[];
  daysPerWeek: number;
  seasons?: string[];
}

export interface TimeInput {
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
}

export interface TimeDuration {
  minutes?: number;
  hours?: number;
  days?: number;
}

export interface TimeLightingPhase {
  hour: number;
  minute?: number;
  lighting: Partial<LightingState>;
}

/**
 * Continuous day night cycle of the `DayNightCycle` preset of `@canvasengine/presets`.
 * The scene is color graded by the hour of the time manager and the light spots of the map are lit at night.
 */
export interface TimeDayNightConfig {
  /** Multiplies every light intensity. */
  lightIntensity?: number;
  /** Multiplies the vignette. */
  vignette?: number;
}

/**
 * Lighting of the time manager for one map. `false` leaves the lighting of the map untouched (an interior, a dungeon).
 * Otherwise the keys replace those of the shared `lighting` configuration for that map.
 */
export type TimeLightingMapConfig = false | Pick<TimeLightingConfig, "dayNight" | "phases" | "transitionMs">;

export interface TimeLightingConfig {
  enabled?: boolean;
  /**
   * Replaces the `phases` by a continuous color grading by the hour. The light spots of the map are kept.
   * `onLightingPhaseChange` is called with the keys of `DayPhase`: `night`, `dawn`, `day` and `dusk`.
   */
  dayNight?: boolean | TimeDayNightConfig;
  phases?: Record<string, TimeLightingPhase>;
  transitionMs?: number;
  /**
   * Per map overrides, by map id. Same idea as `weather.maps`:
   *
   * ```ts
   * lighting: { dayNight: true, maps: { cave: false, tavern: { dayNight: { lightIntensity: 1.4 } } } }
   * ```
   *
   * A map can also opt out on its own side with `lighting: { dayNight: { enabled: false } }`.
   */
  maps?: Record<string, TimeLightingMapConfig>;
}

export type TimeWeatherWeight = number | {
  default?: number;
  months?: Record<number, number>;
  seasons?: Record<string, number>;
};

export type TimeDurationRange = {
  min: TimeDuration;
  max: TimeDuration;
};

export interface TimeWeatherAmbience {
  weather: WeatherState | null;
  weight: TimeWeatherWeight;
  duration: TimeDuration | TimeDurationRange;
}

export interface TimeWeatherTable {
  ambiences: Record<string, TimeWeatherAmbience>;
}

export interface TimeWeatherConfig {
  enabled?: boolean;
  default?: TimeWeatherTable;
  maps?: Record<string, TimeWeatherTable>;
}

export type TimeEnvironmentReason = "initial" | "tick" | "set" | "advance" | "pause" | "resume" | "scale";

export interface TimeTransitionPayload {
  map: unknown;
  previous: TimeState;
  current: TimeState;
  reason: TimeEnvironmentReason;
}

export interface TimeDayTransitionPayload extends TimeTransitionPayload {}

export interface TimeLightingPhaseTransitionPayload {
  map: unknown;
  previousKey?: string;
  currentKey: string;
  previousLighting?: Partial<LightingState>;
  currentLighting: Partial<LightingState>;
  time: TimeState;
  reason: TimeEnvironmentReason;
}

export interface TimeWeatherTransitionPayload {
  map: unknown;
  previousKey?: string;
  currentKey: string;
  previousWeather?: WeatherState | null;
  currentWeather: WeatherState | null;
  durationMinutes: number;
  expiresAtElapsedMinutes: number;
  time: TimeState;
  reason: TimeEnvironmentReason;
}

export interface TimeWeatherBeforeTransitionPayload extends TimeWeatherTransitionPayload {
  candidate: TimeWeatherRollCandidate;
}

export interface TimeWeatherRollCandidate {
  key: string;
  ambience: TimeWeatherAmbience;
}

export type TimeWeatherBeforeTransitionResult = false | TimeWeatherRollCandidate | void;

export interface TimeManagerHooks {
  onTimeChange?: (payload: TimeTransitionPayload) => any;
  onDayChange?: (payload: TimeDayTransitionPayload) => any;
  onLightingPhaseChange?: (payload: TimeLightingPhaseTransitionPayload) => any;
  /** Same transition as `onLightingPhaseChange`, named for gameplay rules (`night` falls, NPCs go home). */
  onPhaseChange?: (payload: TimeLightingPhaseTransitionPayload) => any;
  onBeforeWeatherChange?: (payload: TimeWeatherBeforeTransitionPayload) => TimeWeatherBeforeTransitionResult | Promise<TimeWeatherBeforeTransitionResult>;
  onWeatherChange?: (payload: TimeWeatherTransitionPayload) => any;
}

export type TimeHudPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

/** The clock the client draws on screen: the day, the hour and a medallion whose sky follows the hour. */
export interface TimeHudOptions {
  /** Corner of the screen. Default `top-right`. */
  position?: TimeHudPosition;
  /** `compact` shows the medallion only. Default `default`. */
  size?: "default" | "compact";
  /** Shows the fast forward badge from this scale on. Nothing by default. */
  fastScale?: number;
}

export interface TimeManagerOptions {
  start?: TimeInput | string;
  /**
   * Game minutes elapsed per **real minute** (`60` is one game hour per real minute, `1` is real time).
   * The clock of CanvasEngine (`useGameClock`) counts per real second instead: divide by 60.
   */
  scale?: number;
  calendar?: Partial<TimeCalendarConfig>;
  lighting?: boolean | TimeLightingConfig;
  weather?: boolean | TimeWeatherConfig;
  hooks?: TimeManagerHooks;
  /**
   * Draws the clock on the client (the `rpg-time-hud` GUI). Off by default.
   * The client must register the same module: `provideClientModules([TimeManagerModule])`.
   */
  hud?: boolean | TimeHudOptions;
}

export interface TimeSnapshot {
  elapsedMinutes: number;
  scale: number;
  paused: boolean;
  serverTimestamp: number;
  calendar: TimeCalendarConfig;
}

export type DayPhase = "night" | "dawn" | "day" | "dusk";

/** Hours at which each phase starts. Same values as the `DayNightCycle` preset of `@canvasengine/presets`. */
export const DAY_PHASES: ReadonlyArray<{ phase: DayPhase; from: number }> = [
  { phase: "night", from: 0 },
  { phase: "dawn", from: 5 },
  { phase: "day", from: 7.5 },
  { phase: "dusk", from: 17.5 },
  { phase: "night", from: 20.5 },
];

/** Phase of the day (`night`, `dawn`, `day` or `dusk`) of an hour, `0` to `24` (decimals are minutes). */
export function getDayPhase(hour: number): DayPhase {
  const wrapped = ((hour % 24) + 24) % 24;
  let result: DayPhase = "night";
  for (const entry of DAY_PHASES) {
    if (wrapped >= entry.from) {
      result = entry.phase;
    }
  }
  return result;
}

export interface TimeState extends TimeSnapshot {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** Hour of the day, `0` to `24`, with the minutes and seconds as decimals (`18.5` is 18:30). */
  hourFloat: number;
  /** Phase of the day, from `hourFloat`. */
  phase: DayPhase;
  weekday: number;
  season?: string;
}

export const DEFAULT_TIME_CALENDAR: TimeCalendarConfig = {
  months: 12,
  daysPerMonth: 30,
  daysPerWeek: 7,
  seasons: ["spring", "summer", "autumn", "winter"],
};

export const DEFAULT_TIME_OPTIONS: Required<Pick<TimeManagerOptions, "scale">> & {
  start: TimeInput;
  calendar: TimeCalendarConfig;
  lighting: false;
  weather: false;
} = {
  start: {
    year: 1,
    month: 1,
    day: 1,
    hour: 8,
    minute: 0,
  },
  scale: 1,
  calendar: DEFAULT_TIME_CALENDAR,
  lighting: false,
  weather: false,
};

export function withTimeManager(options: TimeManagerOptions = {}) {
  return {
    server: {
      [TIME_MANAGER_MODULE_KEY]: options,
    },
    client: {
      [TIME_MANAGER_MODULE_KEY]: options,
    },
  };
}

export function normalizeTimeCalendar(calendar: Partial<TimeCalendarConfig> = {}): TimeCalendarConfig {
  const months = Math.max(1, Math.floor(calendar.months ?? DEFAULT_TIME_CALENDAR.months));
  const daysPerWeek = Math.max(1, Math.floor(calendar.daysPerWeek ?? DEFAULT_TIME_CALENDAR.daysPerWeek));
  const daysPerMonth = Array.isArray(calendar.daysPerMonth)
    ? Array.from({ length: months }, (_, index) => Math.max(1, Math.floor(calendar.daysPerMonth?.[index] ?? 30)))
    : Math.max(1, Math.floor(calendar.daysPerMonth ?? (DEFAULT_TIME_CALENDAR.daysPerMonth as number)));

  return {
    months,
    daysPerMonth,
    daysPerWeek,
    seasons: calendar.seasons?.length ? [...calendar.seasons] : [...(DEFAULT_TIME_CALENDAR.seasons ?? [])],
  };
}

export function normalizeTimeOptions(options: TimeManagerOptions = {}) {
  const calendar = normalizeTimeCalendar(options.calendar);
  return {
    start: normalizeTimeInput(options.start ?? DEFAULT_TIME_OPTIONS.start),
    scale: normalizeScale(options.scale ?? DEFAULT_TIME_OPTIONS.scale),
    calendar,
    lighting: normalizeTimeLighting(options.lighting),
    weather: normalizeTimeWeather(options.weather),
    hooks: options.hooks ? { ...options.hooks } : undefined,
  };
}

export function normalizeTimeInput(input: TimeInput | string): Required<TimeInput> {
  if (typeof input === "string") {
    const match = input.trim().match(/^(\d+)-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2}))?$/);
    if (!match) {
      throw new Error(`Invalid time start value "${input}". Expected "YYYY-MM-DD HH:mm".`);
    }
    return normalizeTimeInput({
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
      hour: match[4] === undefined ? 0 : Number(match[4]),
      minute: match[5] === undefined ? 0 : Number(match[5]),
    });
  }

  return {
    year: Math.max(1, Math.floor(input.year ?? 1)),
    month: Math.max(1, Math.floor(input.month ?? 1)),
    day: Math.max(1, Math.floor(input.day ?? 1)),
    hour: clampInt(input.hour ?? 0, 0, 23),
    minute: clampInt(input.minute ?? 0, 0, 59),
  };
}

export function normalizeScale(scale: number): number {
  if (!Number.isFinite(scale)) return 1;
  return Math.max(0, scale);
}

export function normalizeTimeLighting(lighting: TimeManagerOptions["lighting"]): false | TimeLightingConfig {
  if (!lighting) return false;
  if (lighting === true) {
    return { enabled: true };
  }
  return {
    ...lighting,
    enabled: lighting.enabled !== false,
    phases: lighting.phases ? { ...lighting.phases } : undefined,
    maps: lighting.maps ? { ...lighting.maps } : undefined,
  };
}

/**
 * Lighting configuration of the time manager for one map, from the shared configuration and its `maps` override.
 * `false` when the time manager must not touch the lighting of that map.
 */
export function resolveTimeLightingForMap(
  lighting: false | TimeLightingConfig,
  mapId: string | undefined,
): false | TimeLightingConfig {
  if (!lighting || lighting.enabled === false) return false;
  const override = mapId !== undefined ? lighting.maps?.[mapId] : undefined;
  if (override === false) return false;
  if (!override) return lighting;
  return { ...lighting, ...override, maps: undefined };
}

export function normalizeTimeWeather(weather: TimeManagerOptions["weather"]): false | TimeWeatherConfig {
  if (!weather) return false;
  if (weather === true) {
    return { enabled: true };
  }
  return {
    ...weather,
    enabled: weather.enabled !== false,
    default: weather.default ? normalizeTimeWeatherTable(weather.default) : undefined,
    maps: weather.maps
      ? Object.fromEntries(
        Object.entries(weather.maps).map(([mapId, table]) => [mapId, normalizeTimeWeatherTable(table)])
      )
      : undefined,
  };
}

export function normalizeTimeWeatherTable(table: TimeWeatherTable): TimeWeatherTable {
  return {
    ambiences: Object.fromEntries(
      Object.entries(table.ambiences).map(([id, ambience]) => [
        id,
        {
          ...ambience,
          weather: cloneWeatherState(ambience.weather),
          weight: cloneTimeWeatherWeight(ambience.weight),
          duration: cloneTimeWeatherDuration(ambience.duration),
        },
      ])
    ),
  };
}

export function createTimeSnapshot(options: TimeManagerOptions = {}, timestamp = Date.now()): TimeSnapshot {
  const normalized = normalizeTimeOptions(options);
  return {
    elapsedMinutes: timeInputToElapsedMinutes(normalized.start, normalized.calendar),
    scale: normalized.scale,
    paused: false,
    serverTimestamp: timestamp,
    calendar: normalized.calendar,
  };
}

export function timeInputToElapsedMinutes(input: TimeInput, calendar: TimeCalendarConfig): number {
  const normalized = normalizeTimeInput(input);
  const month = clampInt(normalized.month, 1, calendar.months);
  const day = clampInt(normalized.day, 1, getDaysInMonth(calendar, month));
  const yearDays = getDaysInYear(calendar);
  let days = (normalized.year - 1) * yearDays;

  for (let currentMonth = 1; currentMonth < month; currentMonth += 1) {
    days += getDaysInMonth(calendar, currentMonth);
  }

  days += day - 1;
  return days * 1440 + normalized.hour * 60 + normalized.minute;
}

export function elapsedMinutesToTimeState(snapshot: TimeSnapshot, elapsedMinutes = snapshot.elapsedMinutes): TimeState {
  const elapsed = Math.max(0, Math.floor(elapsedMinutes));
  const totalDays = Math.floor(elapsed / 1440);
  const minuteOfDay = elapsed % 1440;
  const yearDays = getDaysInYear(snapshot.calendar);
  const year = Math.floor(totalDays / yearDays) + 1;
  let dayOfYear = totalDays % yearDays;
  let month = 1;

  while (month < snapshot.calendar.months) {
    const daysInMonth = getDaysInMonth(snapshot.calendar, month);
    if (dayOfYear < daysInMonth) break;
    dayOfYear -= daysInMonth;
    month += 1;
  }

  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const hourFloat = (((elapsedMinutes % 1440) + 1440) % 1440) / 60;

  return {
    ...snapshot,
    elapsedMinutes,
    year,
    month,
    day: dayOfYear + 1,
    hour,
    minute,
    hourFloat,
    phase: getDayPhase(hourFloat),
    weekday: totalDays % snapshot.calendar.daysPerWeek,
    season: resolveSeason(snapshot.calendar, month),
  };
}

export function projectTimeState(snapshot: TimeSnapshot, now = Date.now()): TimeState {
  const elapsedMinutes = snapshot.paused
    ? snapshot.elapsedMinutes
    : snapshot.elapsedMinutes + ((now - snapshot.serverTimestamp) / 60000) * snapshot.scale;

  return elapsedMinutesToTimeState(snapshot, elapsedMinutes);
}

export function mergeTimeInput(current: TimeState, input: TimeInput): Required<TimeInput> {
  return normalizeTimeInput({
    year: input.year ?? current.year,
    month: input.month ?? current.month,
    day: input.day ?? current.day,
    hour: input.hour ?? current.hour,
    minute: input.minute ?? current.minute,
  });
}

export function timeDurationToMinutes(duration: TimeDuration | number): number {
  if (typeof duration === "number") {
    return Number.isFinite(duration) ? duration : 0;
  }
  return (duration.minutes ?? 0) + (duration.hours ?? 0) * 60 + (duration.days ?? 0) * 1440;
}

export function resolveTimeWeatherWeight(weight: TimeWeatherWeight, state: Pick<TimeState, "month" | "season">): number {
  if (typeof weight === "number") {
    return Math.max(0, Number.isFinite(weight) ? weight : 0);
  }
  const monthWeight = weight.months?.[state.month];
  if (typeof monthWeight === "number") {
    return Math.max(0, Number.isFinite(monthWeight) ? monthWeight : 0);
  }
  const seasonWeight = state.season ? weight.seasons?.[state.season] : undefined;
  if (typeof seasonWeight === "number") {
    return Math.max(0, Number.isFinite(seasonWeight) ? seasonWeight : 0);
  }
  return Math.max(0, Number.isFinite(weight.default ?? 0) ? weight.default ?? 0 : 0);
}

export function resolveTimeWeatherDuration(duration: TimeDuration | TimeDurationRange, ratio = 0): number {
  if (isTimeDurationRange(duration)) {
    const min = Math.max(0, timeDurationToMinutes(duration.min));
    const max = Math.max(min, timeDurationToMinutes(duration.max));
    return min + (max - min) * clampNumber(ratio, 0, 1);
  }
  return Math.max(0, timeDurationToMinutes(duration));
}

export function isTimeDurationRange(duration: TimeDuration | TimeDurationRange): duration is TimeDurationRange {
  return "min" in duration && "max" in duration;
}

function getDaysInMonth(calendar: TimeCalendarConfig, month: number): number {
  if (Array.isArray(calendar.daysPerMonth)) {
    return calendar.daysPerMonth[month - 1] ?? calendar.daysPerMonth[calendar.daysPerMonth.length - 1] ?? 30;
  }
  return calendar.daysPerMonth;
}

function getDaysInYear(calendar: TimeCalendarConfig): number {
  if (Array.isArray(calendar.daysPerMonth)) {
    return Array.from({ length: calendar.months }, (_, index) => calendar.daysPerMonth[index] ?? 30)
      .reduce((total, days) => total + days, 0);
  }
  return calendar.months * calendar.daysPerMonth;
}

function resolveSeason(calendar: TimeCalendarConfig, month: number): string | undefined {
  if (!calendar.seasons?.length) return undefined;
  const index = Math.min(
    calendar.seasons.length - 1,
    Math.floor(((month - 1) * calendar.seasons.length) / calendar.months)
  );
  return calendar.seasons[index];
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function cloneWeatherState(weather: WeatherState | null): WeatherState | null {
  if (!weather) return null;
  return {
    ...weather,
    params: weather.params ? { ...weather.params } : undefined,
  };
}

function cloneTimeWeatherWeight(weight: TimeWeatherWeight): TimeWeatherWeight {
  if (typeof weight === "number") return weight;
  return {
    ...weight,
    months: weight.months ? { ...weight.months } : undefined,
    seasons: weight.seasons ? { ...weight.seasons } : undefined,
  };
}

function cloneTimeDuration(duration: TimeDuration): TimeDuration {
  return { ...duration };
}

function cloneTimeWeatherDuration(duration: TimeDuration | TimeDurationRange): TimeDuration | TimeDurationRange {
  if (isTimeDurationRange(duration)) {
    return {
      min: cloneTimeDuration(duration.min),
      max: cloneTimeDuration(duration.max),
    };
  }
  return cloneTimeDuration(duration);
}
