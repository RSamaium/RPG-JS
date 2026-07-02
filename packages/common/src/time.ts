import type { LightingState } from "./lighting";

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

export interface TimeLightingConfig {
  enabled?: boolean;
  phases?: Record<string, TimeLightingPhase>;
  transitionMs?: number;
}

export interface TimeManagerOptions {
  start?: TimeInput | string;
  scale?: number;
  calendar?: Partial<TimeCalendarConfig>;
  lighting?: boolean | TimeLightingConfig;
}

export interface TimeSnapshot {
  elapsedMinutes: number;
  scale: number;
  paused: boolean;
  serverTimestamp: number;
  calendar: TimeCalendarConfig;
}

export interface TimeState extends TimeSnapshot {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
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

  return {
    ...snapshot,
    elapsedMinutes,
    year,
    month,
    day: dayOfYear + 1,
    hour,
    minute,
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
