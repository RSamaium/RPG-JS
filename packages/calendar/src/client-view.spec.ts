import { describe, expect, test } from "vitest";
import { buildCells, buildEventItems, glyphOf, iconUrl, labelFor, moveSelection, textOf } from "./client-view";
import type { CalendarView } from "./server-types";
import type { CalendarEntry } from "./shared-types";

const t = (key: string, params: Record<string, unknown> = {}) =>
  ({ "rpg.calendar.day": `Day ${params.day}`, "rpg.calendar.day-in-month": `${params.month}/${params.day}`, "rpg.hello": "Bonjour" } as Record<string, string>)[key] ?? key;

const entry = (patch: Partial<CalendarEntry> = {}): CalendarEntry => ({
  id: "e", title: "Market", category: "market", color: "#5fd16a", icon: "/icons/stall.png",
  date: { year: 1, month: 1, day: 7 }, endDate: { year: 1, month: 1, day: 7 }, scope: "world", source: "events", ...patch,
});

const view = (patch: Partial<CalendarView> = {}): CalendarView => ({
  today: { year: 1, month: 1, day: 3, weekday: 2, weekdayKey: "wed", season: "spring" },
  year: 1, month: 1, season: "spring", months: 12, weekdays: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
  firstWeekday: 2, daysInMonth: 30, days: { 7: [entry()] }, selected: { year: 1, month: 1, day: 3 },
  upcoming: [entry(), entry({ id: "f", title: "Fair", date: { year: 1, month: 2, day: 4 }, endDate: { year: 1, month: 2, day: 4 } })],
  categories: {}, ...patch,
});

describe("calendar window helpers", () => {
  test("builds blank cells before the first day, then one cell per day", () => {
    const cells = buildCells(view(), view().selected, t);
    expect(cells).toHaveLength(2 + 30);
    expect(cells.slice(0, 2).every((cell) => cell.empty)).toBe(true);
    expect(cells[2]).toMatchObject({ day: 1, today: false });
    expect(cells[4]).toMatchObject({ day: 3, today: true, selected: true });
  });

  test("gives every cell and event a stable key", () => {
    const cells = buildCells(view(), null, t);
    expect(new Set(cells.map((cell) => cell.key)).size).toBe(cells.length);
    expect(cells[0].key).toBe("1-1-blank-0");
    const items = buildEventItems(view(), null, t);
    expect(items.map((item) => item.key)).toEqual(["events:e:1-1-7::1-1", "events:f:1-2-4::1-1"]);
  });

  test("a cell gets a new key when its state changes, so it is drawn again", () => {
    const keyOf = (selected: { year: number; month: number; day: number } | null, day: number) =>
      buildCells(view(), selected, t).find((cell) => cell.day === day)!.key;
    expect(keyOf({ year: 1, month: 1, day: 17 }, 17)).not.toBe(keyOf(null, 17));
    expect(keyOf({ year: 1, month: 1, day: 17 }, 3)).toBe(keyOf(null, 3));
    // Today moves out of the viewed month.
    const next = buildCells(view({ month: 2 }), null, t).find((cell) => cell.day === 3)!;
    expect(next.today).toBe(false);
    expect(next.key).not.toBe(keyOf(null, 3));
  });

  test("a day with events shows the icon and the color of its first event", () => {
    const cell = buildCells(view(), null, t).find((c) => c.day === 7)!;
    expect(cell).toMatchObject({ iconUrl: "/icons/stall.png", dotStyle: "--rpg-ui-calendar-color:#5fd16a;" });
    expect(cell.label).toBe("7: Market");
  });

  test("today is only marked in the month that holds it", () => {
    const cells = buildCells(view({ month: 2 }), null, t);
    expect(cells.some((cell) => cell.today)).toBe(false);
  });

  test("tells a url from a glyph", () => {
    expect(iconUrl(entry({ icon: "icons/a.png" }))).toBe("icons/a.png");
    expect(iconUrl(entry({ icon: "★" }))).toBeUndefined();
    expect(glyphOf(entry({ icon: "★" }))).toBe("★");
    expect(glyphOf(entry({ icon: "market-stall" }))).toBe("◇");
    expect(glyphOf(entry({ icon: undefined }))).toBe("◇");
  });

  test("lists the events with the day, or the month when it is another one", () => {
    const items = buildEventItems(view(), { year: 1, month: 1, day: 7 }, t);
    expect(items.map((item) => item.when)).toEqual(["Day 7", "2/4"]);
    const farAway = buildEventItems(view({ upcoming: [entry({ date: { year: 2, month: 1, day: 7 } })] }), null, (key, params) => key + JSON.stringify(params));
    expect(farAway[0].when).toContain("day-in-year");
    expect(items[0].selected).toBe(true);
    expect(items[1].selected).toBe(false);
  });

  test("translates an i18n key and leaves any other text as is", () => {
    expect(textOf(t, "rpg.hello")).toBe("Bonjour");
    expect(textOf(t, "Fishing Tournament")).toBe("Fishing Tournament");
    expect(textOf(t, undefined)).toBe("");
    expect(labelFor(t, "rpg.missing", "Fallback")).toBe("Fallback");
    expect(labelFor(t, "rpg.hello", "Fallback")).toBe("Bonjour");
  });

  test("moves the selected day inside the month and across its edges", () => {
    const v = view();
    expect(moveSelection(v, { year: 1, month: 1, day: 3 }, { days: 1 })).toMatchObject({ sameMonth: true, selected: { day: 4 } });
    expect(moveSelection(v, { year: 1, month: 1, day: 3 }, { weeks: 1 })).toMatchObject({ sameMonth: true, selected: { day: 10 } });
    expect(moveSelection(v, { year: 1, month: 1, day: 1 }, { days: -1 })).toMatchObject({ sameMonth: false, year: 1, month: 12, day: 9999 });
    expect(moveSelection(v, { year: 1, month: 1, day: 30 }, { days: 1 })).toMatchObject({ sameMonth: false, year: 1, month: 2, day: 1 });
    expect(moveSelection(v, { year: 1, month: 1, day: 28 }, { weeks: 1 })).toMatchObject({ sameMonth: false, month: 2, day: 5 });
  });
});
