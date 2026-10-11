import type { CalendarEntry } from "./shared-types";
import type { CalendarView } from "./server-types";

type Translate = (key: string, params?: Record<string, unknown>) => string;

/** A translation, or the fallback when the key has none. */
export function labelFor(t: Translate, key: string, fallback: string): string {
  const value = t(key);
  return value && value !== key ? value : fallback;
}

/** Text of a title or a description: an `rpg.` key is translated, anything else is shown as is. */
export function textOf(t: Translate, value: string | undefined): string {
  if (!value) return "";
  return value.startsWith("rpg.") ? t(value) : value;
}

const isUrl = (icon: string | undefined): icon is string => Boolean(icon && /[/.]/.test(icon));

/** The icon as an image, when it is an URL or a path. */
export function iconUrl(entry: CalendarEntry | undefined): string | undefined {
  return isUrl(entry?.icon) ? entry!.icon : undefined;
}

/** A short text shown instead of an image: the icon when it is a glyph, `◇` otherwise. */
export function glyphOf(entry: CalendarEntry | undefined): string {
  const icon = entry?.icon;
  return icon && !isUrl(icon) && Array.from(icon).length <= 2 ? icon : "◇";
}

const dotStyle = (color?: string) => (color ? `--rpg-ui-calendar-color:${color};` : "");

export interface CalendarCell {
  /** Stable key of the cell, so the grid is updated instead of appended to. */
  key: string;
  empty?: boolean;
  day: number;
  today: boolean;
  selected: boolean;
  entries: CalendarEntry[];
  label: string;
  iconUrl?: string;
  glyph: string;
  dotStyle: string;
}

/** The cells of the grid: blanks before the first day, then one cell per day. */
export function buildCells(view: CalendarView, selected: { year: number; month: number; day: number } | null, t: Translate): CalendarCell[] {
  const cells: CalendarCell[] = [];
  for (let index = 0; index < view.firstWeekday; index += 1) {
    cells.push({ key: `${view.year}-${view.month}-blank-${index}`, empty: true, day: 0, today: false, selected: false, entries: [], label: "", glyph: "", dotStyle: "" });
  }
  for (let day = 1; day <= view.daysInMonth; day += 1) {
    const entries = view.days[day] ?? [];
    const lead = entries[0];
    const today = view.today.year === view.year && view.today.month === view.month && view.today.day === day;
    const isSelected = Boolean(selected && selected.year === view.year && selected.month === view.month && selected.day === day);
    cells.push({
      // The state is part of the key: a cell is drawn again when it changes (today, selected, its events).
      key: `${view.year}-${view.month}-${day}:${today ? "t" : ""}${isSelected ? "s" : ""}:${entries.map((entry) => entry.id).join(",")}`,
      day,
      today,
      selected: isSelected,
      entries,
      label: entries.length ? `${day}: ${entries.map((entry) => textOf(t, entry.title)).join(", ")}` : String(day),
      iconUrl: iconUrl(lead),
      glyph: glyphOf(lead),
      dotStyle: dotStyle(lead?.color),
    });
  }
  return cells;
}

export interface CalendarEventItem {
  key: string;
  entry: CalendarEntry;
  title: string;
  description: string;
  when: string;
  selected: boolean;
  iconUrl?: string;
  glyph: string;
  dotStyle: string;
}

const sameDay = (a: { year: number; month: number; day: number }, b: { year: number; month: number; day: number } | null) =>
  Boolean(b && a.year === b.year && a.month === b.month && a.day === b.day);

/** Where an entry lands: `Day 7`, `2/7` in another month, or with its year when it is not in the viewed one. */
function whenOf(view: CalendarView, entry: CalendarEntry, t: Translate): string {
  if (entry.date.year !== view.year) {
    return t("rpg.calendar.day-in-year", { year: entry.date.year, month: entry.date.month, day: entry.date.day });
  }
  if (entry.date.month === view.month) {
    return t("rpg.calendar.day", { day: entry.date.day });
  }
  return t("rpg.calendar.day-in-month", { month: entry.date.month, day: entry.date.day });
}

export function buildEventItems(view: CalendarView, selected: { year: number; month: number; day: number } | null, t: Translate): CalendarEventItem[] {
  return view.upcoming.map((entry) => ({
    key: `${entry.source}:${entry.id}:${entry.date.year}-${entry.date.month}-${entry.date.day}:${sameDay(entry.date, selected) ? "s" : ""}:${view.year}-${view.month}`,
    entry,
    title: textOf(t, entry.title),
    description: textOf(t, entry.description),
    when: whenOf(view, entry, t),
    selected: sameDay(entry.date, selected),
    iconUrl: iconUrl(entry),
    glyph: glyphOf(entry),
    dotStyle: dotStyle(entry.color),
  }));
}

export function formatSelected(view: CalendarView, selected: { year: number; month: number; day: number } | null, t: Translate): string {
  const date = selected ?? view.today;
  return t("rpg.calendar.day", { day: date.day });
}

/**
 * Moves the selected day by days or weeks. Leaving the month asks for the previous or the next one;
 * the server clamps a day that does not exist (`day: 9999` is the last day).
 */
export function moveSelection(
  view: CalendarView,
  selected: { year: number; month: number; day: number } | null,
  delta: { days?: number; weeks?: number },
): { sameMonth: boolean; selected: { year: number; month: number; day: number }; year: number; month: number; day: number } {
  const current = selected ?? { year: view.year, month: view.month, day: 1 };
  const step = (delta.days ?? 0) + (delta.weeks ?? 0) * view.weekdays.length;
  const target = current.day + step;
  if (target >= 1 && target <= view.daysInMonth) {
    const next = { year: view.year, month: view.month, day: target };
    return { sameMonth: true, selected: next, ...next };
  }
  if (target < 1) {
    const month = view.month === 1 ? view.months : view.month - 1;
    const year = view.month === 1 ? Math.max(1, view.year - 1) : view.year;
    return { sameMonth: false, selected: { year, month, day: 9999 }, year, month, day: 9999 };
  }
  const month = view.month === view.months ? 1 : view.month + 1;
  const year = view.month === view.months ? view.year + 1 : view.year;
  const day = Math.max(1, target - view.daysInMonth);
  return { sameMonth: false, selected: { year, month, day }, year, month, day };
}
