import type {
  CalendarConfig,
  CalendarDate,
  CalendarDateInfo,
  ResolvedCalendarConfig,
} from "./shared-types";

export const DEFAULT_WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const positiveInt = (value: unknown, fallback: number): number => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 1 ? Math.floor(number) : fallback;
};

export function resolveCalendarConfig(config: CalendarConfig = {}): ResolvedCalendarConfig {
  const months = positiveInt(config.months, 12);
  const source = config.daysPerMonth;
  const daysPerMonth = Array.from({ length: months }, (_, index) => {
    if (Array.isArray(source)) {
      return positiveInt(source[index] ?? source[source.length - 1], 30);
    }
    return positiveInt(source, 30);
  });
  const weekdays = (config.weekdays ?? DEFAULT_WEEKDAYS).filter(
    (key): key is string => typeof key === "string" && key.length > 0,
  );
  if (weekdays.length === 0) {
    weekdays.push(...DEFAULT_WEEKDAYS);
  }
  const epoch = Math.floor(Number(config.epochWeekday ?? 0));
  return {
    months,
    daysPerMonth,
    weekdays,
    epochWeekday: Number.isFinite(epoch) ? ((epoch % weekdays.length) + weekdays.length) % weekdays.length : 0,
    seasons: (config.seasons ?? []).filter((season) => typeof season === "string" && season.length > 0),
  };
}

export function daysInMonth(config: ResolvedCalendarConfig, month: number): number {
  return config.daysPerMonth[clamp(month, 1, config.months) - 1];
}

export function daysInYear(config: ResolvedCalendarConfig): number {
  return config.daysPerMonth.reduce((total, days) => total + days, 0);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.floor(value)));
}

/** Clamps a date into the calendar: month and day in range, year `1` or more. */
export function normalizeDate(config: ResolvedCalendarConfig, date: CalendarDate): CalendarDate {
  const month = clamp(date.month, 1, config.months);
  return {
    year: Math.max(1, Math.floor(date.year)),
    month,
    day: clamp(date.day, 1, daysInMonth(config, month)),
  };
}

/** Days elapsed since the first day of year 1 (`0`). */
export function toOrdinal(config: ResolvedCalendarConfig, date: CalendarDate): number {
  const normalized = normalizeDate(config, date);
  let days = (normalized.year - 1) * daysInYear(config);
  for (let month = 1; month < normalized.month; month += 1) {
    days += daysInMonth(config, month);
  }
  return days + normalized.day - 1;
}

export function fromOrdinal(config: ResolvedCalendarConfig, ordinal: number): CalendarDate {
  const total = Math.max(0, Math.floor(ordinal));
  const yearDays = daysInYear(config);
  let remaining = total % yearDays;
  let month = 1;
  while (month < config.months && remaining >= daysInMonth(config, month)) {
    remaining -= daysInMonth(config, month);
    month += 1;
  }
  return { year: Math.floor(total / yearDays) + 1, month, day: remaining + 1 };
}

export function addDays(config: ResolvedCalendarConfig, date: CalendarDate, days: number): CalendarDate {
  return fromOrdinal(config, toOrdinal(config, date) + Math.floor(days));
}

export function compareDates(config: ResolvedCalendarConfig, a: CalendarDate, b: CalendarDate): number {
  return toOrdinal(config, a) - toOrdinal(config, b);
}

export function weekdayIndex(config: ResolvedCalendarConfig, date: CalendarDate): number {
  const size = config.weekdays.length;
  return (toOrdinal(config, date) + config.epochWeekday) % size;
}

/** Season of a month: the seasons split the months evenly. */
export function seasonOfMonth(config: ResolvedCalendarConfig, month: number): string | undefined {
  if (config.seasons.length === 0) return undefined;
  const perSeason = config.months / config.seasons.length;
  const index = Math.min(config.seasons.length - 1, Math.floor((clamp(month, 1, config.months) - 1) / perSeason));
  return config.seasons[index];
}

export function describeDate(config: ResolvedCalendarConfig, date: CalendarDate): CalendarDateInfo {
  const normalized = normalizeDate(config, date);
  const weekday = weekdayIndex(config, normalized);
  return {
    ...normalized,
    weekday,
    weekdayKey: config.weekdays[weekday],
    season: seasonOfMonth(config, normalized.month),
  };
}

/** Position of a month inside its season (`{ index: 2, count: 3 }`), `undefined` without seasons. */
export function monthInSeason(config: ResolvedCalendarConfig, month: number): { index: number; count: number } | undefined {
  const season = seasonOfMonth(config, month);
  if (season === undefined) return undefined;
  let first = month;
  while (first > 1 && seasonOfMonth(config, first - 1) === season) first -= 1;
  let last = month;
  while (last < config.months && seasonOfMonth(config, last + 1) === season) last += 1;
  return { index: month - first + 1, count: last - first + 1 };
}
