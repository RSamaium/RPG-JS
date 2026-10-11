import { addDays, compareDates, daysInMonth, fromOrdinal, seasonOfMonth, toOrdinal, weekdayIndex } from "./dates";
import type {
  CalendarCategory,
  CalendarDate,
  CalendarEntry,
  CalendarEventDefinition,
  CalendarRange,
  ResolvedCalendarConfig,
} from "./shared-types";

const MAX_LASTS = 366;

/** Checks a definition and returns a copy. Throws a readable error when it is invalid. */
export function normalizeEventDefinition(
  definition: CalendarEventDefinition,
  config?: ResolvedCalendarConfig,
): CalendarEventDefinition {
  const label = typeof definition?.id === "string" && definition.id ? `"${definition.id}"` : "(no id)";
  if (typeof definition?.id !== "string" || !definition.id) {
    throw new Error("Calendar event: `id` is required.");
  }
  if (typeof definition.title !== "string" || !definition.title) {
    throw new Error(`Calendar event ${label}: \`title\` is required.`);
  }
  if (Boolean(definition.on) === Boolean(definition.every)) {
    throw new Error(`Calendar event ${label}: set either \`on\` (a date) or \`every\` (a weekday).`);
  }
  if (definition.on && !(Number.isInteger(definition.on.day) && definition.on.day >= 1)) {
    throw new Error(`Calendar event ${label}: \`on.day\` must be an integer from 1.`);
  }
  if (definition.on?.month !== undefined && config && !(Number.isInteger(definition.on.month) && definition.on.month >= 1 && definition.on.month <= config.months)) {
    throw new Error(`Calendar event ${label}: \`on.month\` must be between 1 and ${config.months}.`);
  }
  if (definition.every) {
    const { weekday } = definition.every;
    const known = typeof weekday === "number"
      ? Number.isInteger(weekday) && weekday >= 0 && (!config || weekday < config.weekdays.length)
      : typeof weekday === "string" && (!config || config.weekdays.includes(weekday));
    if (!known) {
      throw new Error(`Calendar event ${label}: unknown weekday "${String(weekday)}".`);
    }
  }
  if (definition.lasts !== undefined && !(Number.isInteger(definition.lasts) && definition.lasts >= 1 && definition.lasts <= MAX_LASTS)) {
    throw new Error(`Calendar event ${label}: \`lasts\` must be an integer between 1 and ${MAX_LASTS}.`);
  }
  return {
    ...definition,
    on: definition.on ? { ...definition.on } : undefined,
    every: definition.every ? { ...definition.every } : undefined,
  };
}

function startDates(
  config: ResolvedCalendarConfig,
  definition: CalendarEventDefinition,
  from: CalendarDate,
  to: CalendarDate,
): CalendarDate[] {
  const dates: CalendarDate[] = [];
  if (definition.on) {
    const { year, month, day } = definition.on;
    const years = year !== undefined ? [year] : range(from.year, to.year);
    for (const candidateYear of years) {
      const months = month !== undefined ? [month] : range(1, config.months);
      for (const candidateMonth of months) {
        if (day <= daysInMonth(config, candidateMonth)) {
          dates.push({ year: candidateYear, month: candidateMonth, day });
        }
      }
    }
    return dates;
  }
  if (definition.every) {
    const target = typeof definition.every.weekday === "number"
      ? definition.every.weekday
      : config.weekdays.indexOf(definition.every.weekday);
    for (let ordinal = toOrdinal(config, from); ordinal <= toOrdinal(config, to); ordinal += 1) {
      const date = fromOrdinal(config, ordinal);
      if (weekdayIndex(config, date) !== target) continue;
      if (definition.every.month !== undefined && date.month !== definition.every.month) continue;
      dates.push(date);
    }
  }
  return dates;
}

function range(from: number, to: number): number[] {
  const values: number[] = [];
  for (let value = Math.max(1, from); value <= to; value += 1) values.push(value);
  return values;
}

export interface ResolveOptions {
  categories?: Record<string, CalendarCategory>;
  scope?: "world" | "player";
  source?: string;
}

/**
 * Occurrences of the events that overlap `range`, ordered by date then title.
 * An event that lasts several days is returned once, with its first and last day.
 */
export function resolveEntries(
  config: ResolvedCalendarConfig,
  definitions: CalendarEventDefinition[],
  rangeToResolve: CalendarRange,
  options: ResolveOptions = {},
): CalendarEntry[] {
  const entries: CalendarEntry[] = [];
  const rangeStart = toOrdinal(config, rangeToResolve.from);
  const rangeEnd = toOrdinal(config, rangeToResolve.to);
  for (const definition of definitions) {
    const lasts = definition.lasts ?? 1;
    // An event that began before the range can still be running in it.
    const searchFrom = addDays(config, rangeToResolve.from, -(lasts - 1));
    for (const start of startDates(config, definition, searchFrom, rangeToResolve.to)) {
      const startOrdinal = toOrdinal(config, start);
      const endOrdinal = startOrdinal + lasts - 1;
      if (endOrdinal < rangeStart || startOrdinal > rangeEnd) continue;
      if (definition.season && seasonOfMonth(config, start.month) !== definition.season) continue;
      const category = definition.category ? options.categories?.[definition.category] : undefined;
      const entry: CalendarEntry = {
        id: definition.id,
        title: definition.title,
        description: definition.description,
        category: definition.category,
        icon: definition.icon ?? category?.icon,
        color: category?.color,
        date: start,
        endDate: fromOrdinal(config, endOrdinal),
        from: definition.from,
        to: definition.to,
        map: definition.map,
        scope: options.scope ?? "world",
        source: options.source ?? "events",
      };
      entries.push(entry);
    }
  }
  return entries.sort(
    (a, b) => compareDates(config, a.date, b.date) || a.title.localeCompare(b.title),
  );
}
