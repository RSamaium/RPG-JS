import { describe, expect, test } from "vitest";
import {
  addDays,
  describeDate,
  fromOrdinal,
  resolveCalendarConfig,
  seasonOfMonth,
  monthInSeason,
  toOrdinal,
} from "./dates";

describe("calendar dates", () => {
  const config = resolveCalendarConfig({ seasons: ["spring", "summer", "autumn", "winter"] });

  test("uses 12 months of 30 days and a monday first week by default", () => {
    const plain = resolveCalendarConfig();
    expect(plain.months).toBe(12);
    expect(plain.daysPerMonth).toEqual(Array(12).fill(30));
    expect(plain.weekdays[0]).toBe("mon");
    expect(plain.seasons).toEqual([]);
  });

  test("converts a date to a day count and back", () => {
    expect(toOrdinal(config, { year: 1, month: 1, day: 1 })).toBe(0);
    expect(toOrdinal(config, { year: 1, month: 2, day: 1 })).toBe(30);
    expect(toOrdinal(config, { year: 2, month: 1, day: 1 })).toBe(360);
    for (const ordinal of [0, 29, 30, 359, 360, 1234]) {
      expect(toOrdinal(config, fromOrdinal(config, ordinal))).toBe(ordinal);
    }
  });

  test("adds days across months and years", () => {
    expect(addDays(config, { year: 1, month: 1, day: 30 }, 1)).toEqual({ year: 1, month: 2, day: 1 });
    expect(addDays(config, { year: 1, month: 12, day: 30 }, 1)).toEqual({ year: 2, month: 1, day: 1 });
    expect(addDays(config, { year: 1, month: 1, day: 1 }, -5)).toEqual({ year: 1, month: 1, day: 1 });
  });

  test("supports months of different lengths", () => {
    const uneven = resolveCalendarConfig({ months: 3, daysPerMonth: [31, 28, 30] });
    expect(addDays(uneven, { year: 1, month: 2, day: 28 }, 1)).toEqual({ year: 1, month: 3, day: 1 });
    expect(toOrdinal(uneven, { year: 2, month: 1, day: 1 })).toBe(89);
  });

  test("computes the weekday from the first day of year 1", () => {
    expect(describeDate(config, { year: 1, month: 1, day: 1 }).weekdayKey).toBe("mon");
    expect(describeDate(config, { year: 1, month: 1, day: 3 }).weekdayKey).toBe("wed");
    const shifted = resolveCalendarConfig({ epochWeekday: 2 });
    expect(describeDate(shifted, { year: 1, month: 1, day: 1 }).weekdayKey).toBe("wed");
  });

  test("splits the months evenly between the seasons", () => {
    expect([1, 3, 4, 6, 7, 10, 12].map((month) => seasonOfMonth(config, month))).toEqual([
      "spring", "spring", "summer", "summer", "autumn", "winter", "winter",
    ]);
  });

  test("tells the months of a season apart", () => {
    expect([1, 2, 3, 4].map((month) => monthInSeason(config, month))).toEqual([
      { index: 1, count: 3 }, { index: 2, count: 3 }, { index: 3, count: 3 }, { index: 1, count: 3 },
    ]);
    expect(monthInSeason(resolveCalendarConfig(), 1)).toBeUndefined();
    const one = resolveCalendarConfig({ months: 4, seasons: ["spring", "summer", "autumn", "winter"] });
    expect(monthInSeason(one, 2)).toEqual({ index: 1, count: 1 });
  });

  test("clamps an out of range date into the calendar", () => {
    expect(describeDate(config, { year: 0, month: 99, day: 99 })).toMatchObject({ year: 1, month: 12, day: 30 });
  });
});
