import { describe, expect, test } from "vitest";
import { resolveCalendarConfig } from "./dates";
import { normalizeEventDefinition, resolveEntries } from "./events";

const config = resolveCalendarConfig({ seasons: ["spring", "summer", "autumn", "winter"] });
const month = (m: number) => ({ from: { year: 1, month: m, day: 1 }, to: { year: 1, month: m, day: 30 } });

describe("calendar events", () => {
  test("a yearly event comes back every year", () => {
    const events = [{ id: "fair", title: "Fair", on: { month: 1, day: 7 } }];
    expect(resolveEntries(config, events, month(1)).map((e) => e.date.day)).toEqual([7]);
    const year2 = resolveEntries(config, events, { from: { year: 2, month: 1, day: 1 }, to: { year: 2, month: 1, day: 30 } });
    expect(year2).toHaveLength(1);
    expect(resolveEntries(config, events, month(2))).toHaveLength(0);
  });

  test("an event with a year happens once", () => {
    const events = [{ id: "once", title: "Once", on: { year: 1, month: 1, day: 5 } }];
    expect(resolveEntries(config, events, month(1))).toHaveLength(1);
    expect(resolveEntries(config, events, { from: { year: 2, month: 1, day: 1 }, to: { year: 2, month: 1, day: 30 } })).toHaveLength(0);
  });

  test("an event without a month comes back every month", () => {
    const events = [{ id: "pay", title: "Pay day", on: { day: 1 } }];
    const entries = resolveEntries(config, events, { from: { year: 1, month: 1, day: 1 }, to: { year: 1, month: 3, day: 30 } });
    expect(entries.map((e) => e.date.month)).toEqual([1, 2, 3]);
  });

  test("a weekly event lands on every matching weekday", () => {
    const events = [{ id: "arena", title: "Arena", every: { weekday: "fri" } }];
    expect(resolveEntries(config, events, month(1)).map((e) => e.date.day)).toEqual([5, 12, 19, 26]);
  });

  test("a weekly event can be limited to a month and a season", () => {
    const inMonth = [{ id: "m", title: "M", every: { weekday: "fri", month: 1 } }];
    expect(resolveEntries(config, inMonth, { from: { year: 1, month: 1, day: 1 }, to: { year: 1, month: 2, day: 30 } })).toHaveLength(4);
    const seasonal = [{ id: "s", title: "S", every: { weekday: "mon" }, season: "summer" }];
    expect(resolveEntries(config, seasonal, month(1))).toHaveLength(0);
    expect(resolveEntries(config, seasonal, month(4)).length).toBeGreaterThan(0);
  });

  test("an event that lasts several days is returned once, even when it began before the range", () => {
    const events = [{ id: "fest", title: "Festival", on: { month: 1, day: 29 }, lasts: 4 }];
    const first = resolveEntries(config, events, month(1));
    expect(first).toHaveLength(1);
    expect(first[0].endDate).toEqual({ year: 1, month: 2, day: 2 });
    const second = resolveEntries(config, events, month(2));
    expect(second).toHaveLength(1);
    expect(second[0].date).toEqual({ year: 1, month: 1, day: 29 });
  });

  test("takes the icon and the color from the category", () => {
    const entries = resolveEntries(config, [{ id: "a", title: "A", category: "market", on: { month: 1, day: 2 } }], month(1), {
      categories: { market: { color: "#5fd16a", icon: "stall" } },
    });
    expect(entries[0]).toMatchObject({ icon: "stall", color: "#5fd16a" });
    const own = resolveEntries(config, [{ id: "b", title: "B", category: "market", icon: "own", on: { month: 1, day: 2 } }], month(1), {
      categories: { market: { icon: "stall" } },
    });
    expect(own[0].icon).toBe("own");
  });

  test("orders by date then title", () => {
    const entries = resolveEntries(config, [
      { id: "z", title: "Zeta", on: { month: 1, day: 3 } },
      { id: "a", title: "Alpha", on: { month: 1, day: 3 } },
      { id: "e", title: "Early", on: { month: 1, day: 1 } },
    ], month(1));
    expect(entries.map((e) => e.id)).toEqual(["e", "a", "z"]);
  });

  test("rejects invalid definitions with a readable error", () => {
    expect(() => normalizeEventDefinition({ id: "", title: "x", on: { day: 1 } })).toThrow("`id` is required");
    expect(() => normalizeEventDefinition({ id: "a", title: "", on: { day: 1 } })).toThrow("`title` is required");
    expect(() => normalizeEventDefinition({ id: "a", title: "x" })).toThrow("either `on`");
    expect(() => normalizeEventDefinition({ id: "a", title: "x", on: { day: 1 }, every: { weekday: "mon" } })).toThrow("either `on`");
    expect(() => normalizeEventDefinition({ id: "a", title: "x", every: { weekday: "xyz" } }, config)).toThrow('unknown weekday "xyz"');
    expect(() => normalizeEventDefinition({ id: "a", title: "x", on: { month: 13, day: 1 } }, config)).toThrow("between 1 and 12");
    expect(() => normalizeEventDefinition({ id: "a", title: "x", on: { day: 1 }, lasts: 0 })).toThrow("`lasts`");
  });
});
