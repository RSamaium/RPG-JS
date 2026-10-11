import { describe, expect, test, vi } from "vitest";
import { CALENDAR_GUI_ID, CALENDAR_VIEW_INTERACTION } from "./config";
import { CalendarService } from "./service";
import type { CalendarPlayerLike } from "./server-types";

const seasons = ["spring", "summer", "autumn", "winter"];

const createPlayer = () => {
  const handlers = new Map<string, (data: unknown) => unknown>();
  const gui = {
    open: vi.fn(async () => null),
    on: vi.fn((event: string, callback: (data: unknown) => unknown) => {
      handlers.set(event, callback);
    }),
    update: vi.fn(),
  };
  const player: CalendarPlayerLike = { gui: vi.fn(() => gui) };
  return { player, gui, handlers };
};

const create = (extra = {}) =>
  new CalendarService({
    calendar: { seasons },
    today: { year: 1, month: 1, day: 3 },
    categories: { market: { color: "#5fd16a", icon: "stall" } },
    events: [
      { id: "market", title: "Village Market", category: "market", on: { month: 1, day: 7 } },
      { id: "fishing", title: "Fishing Tournament", on: { month: 1, day: 12 } },
      { id: "arena", title: "Arena Challenge", every: { weekday: "fri" } },
    ],
    ...extra,
  });

describe("CalendarService", () => {
  test("describes today and moves it", async () => {
    const calendar = create();
    expect(calendar.today()).toMatchObject({ year: 1, month: 1, day: 3, weekdayKey: "wed", season: "spring" });
    await calendar.advance();
    expect(calendar.today().day).toBe(4);
    await calendar.advance({ weeks: 1 });
    expect(calendar.today().day).toBe(11);
    await calendar.setToday({ year: 2, month: 3, day: 1 });
    expect(calendar.today()).toMatchObject({ year: 2, month: 3, day: 1 });
  });

  test("lists the events to come from a date, in order and limited", async () => {
    const calendar = create();
    const list = await calendar.upcoming({ year: 1, month: 1, day: 3 }, { limit: 4 });
    expect(list.map((entry) => `${entry.date.day}:${entry.id}`)).toEqual([
      "5:arena", "7:market", "12:arena", "12:fishing",
    ]);
    expect(list[1]).toMatchObject({ icon: "stall", color: "#5fd16a" });
  });

  test("builds the view of a month with the events of each day", async () => {
    const calendar = create();
    const view = await calendar.view(undefined, {});
    expect(view).toMatchObject({
      year: 1, month: 1, season: "spring", monthInSeason: { index: 1, count: 3 }, daysInMonth: 30, firstWeekday: 0,
      selected: { year: 1, month: 1, day: 3 },
    });
    expect(Object.keys(view.days).map(Number)).toEqual([5, 7, 12, 19, 26]);
    expect(view.days[7][0].id).toBe("market");
    expect(view.upcoming[0].date.day).toBe(5);
    expect(view.weekdays).toHaveLength(7);
  });

  test("lists a multi day event on each of its days", async () => {
    const calendar = create();
    calendar.addEvent({ id: "fair", title: "Fair", on: { month: 1, day: 20 }, lasts: 3 });
    const view = await calendar.view(undefined, {});
    expect([20, 21, 22].every((day) => view.days[day]?.some((entry) => entry.id === "fair"))).toBe(true);
    expect(view.days[23]?.some((entry) => entry.id === "fair")).toBeFalsy();
  });

  test("asks a source for its events and keeps a player source for that player only", async () => {
    const quest = { id: "quest", scope: "player" as const, list: vi.fn(() => [{ id: "key", title: "Silver key", on: { year: 1, month: 1, day: 15 } }]) };
    const birthday = { id: "birthdays", list: vi.fn(async () => [{ id: "elias", title: "Elias", on: { month: 1, day: 9 } }]) };
    const calendar = create({ sources: [quest, birthday] });
    const { player } = createPlayer();

    const forPlayer = await calendar.view(player, {});
    expect(forPlayer.days[15]?.[0]).toMatchObject({ id: "key", scope: "player", source: "quest" });
    expect(forPlayer.days[9]?.[0]).toMatchObject({ id: "elias", scope: "world", source: "birthdays" });

    const world = await calendar.view(undefined, {});
    expect(world.days[15]).toBeUndefined();
    expect(world.days[9]).toBeDefined();
    expect(quest.list).toHaveBeenCalledTimes(1);
  });

  test("a failing or invalid source does not break the calendar", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const calendar = create({
      sources: [
        { id: "broken", list: () => { throw new Error("boom"); } },
        { id: "invalid", list: () => [{ id: "", title: "x", on: { day: 1 } }] },
      ],
    });
    const view = await calendar.view(undefined, {});
    expect(view.days[7]).toBeDefined();
    expect(error).toHaveBeenCalledTimes(2);
    error.mockRestore();
  });

  test("opens the window and answers the month requests of the client", async () => {
    const calendar = create();
    const { player, gui, handlers } = createPlayer();

    await calendar.open(player, { waitForClose: false });
    expect(player.gui).toHaveBeenCalledWith(CALENDAR_GUI_ID);
    expect(gui.open).toHaveBeenCalledWith(
      expect.objectContaining({ month: 1 }),
      { waitingAction: false, blockPlayerInput: true },
    );

    await handlers.get(CALENDAR_VIEW_INTERACTION)!({ year: 1, month: 2 });
    expect(gui.update).toHaveBeenCalledWith(expect.objectContaining({ month: 2, season: "spring" }));
  });

  test("calls the hooks when the day changes and when an event starts or ends", async () => {
    const onDayChange = vi.fn();
    const onEventStart = vi.fn();
    const onEventEnd = vi.fn();
    const calendar = create({ hooks: { onDayChange, onEventStart, onEventEnd } });
    calendar.addEvent({ id: "fair", title: "Fair", on: { month: 1, day: 9 }, lasts: 2 });

    await calendar.setToday({ year: 1, month: 1, day: 3 });
    expect(onDayChange).not.toHaveBeenCalled();

    await calendar.advance(4); // 3 -> 7: the market starts
    expect(onDayChange).toHaveBeenCalledTimes(1);
    expect(onDayChange.mock.calls[0][0]).toMatchObject({ previous: { day: 3 }, current: { day: 7 } });
    expect(onEventStart.mock.calls.map((call) => call[0].entry.id)).toEqual(["arena", "market"]);
    // The arena (day 5) started and ended while time went from 3 to 7.
    expect(onEventEnd.mock.calls.map((call) => call[0].entry.id)).toEqual(["arena"]);

    onEventStart.mockClear();
    await calendar.advance(3); // 7 -> 10: the fair starts (9-10), the market ended
    expect(onEventStart.mock.calls.map((call) => call[0].entry.id)).toEqual(["fair"]);
    expect(onEventEnd.mock.calls.map((call) => call[0].entry.id)).toEqual(["arena", "market"]);

    await calendar.advance(1); // 10 -> 11: the fair ended
    expect(onEventEnd.mock.calls.map((call) => call[0].entry.id)).toEqual(["arena", "market", "fair"]);
  });

  test("a hook that throws does not stop the others", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const onEventStart = vi.fn();
    const calendar = create({ hooks: { onDayChange: () => { throw new Error("boom"); }, onEventStart } });
    await calendar.advance(4);
    expect(onEventStart).toHaveBeenCalled();
    error.mockRestore();
  });

  test("rejects an invalid event and removes one by id", () => {
    const calendar = create();
    expect(() => calendar.addEvent({ id: "x", title: "X" })).toThrow("either `on`");
    expect(calendar.removeEvent("market")).toBe(true);
    expect(calendar.removeEvent("market")).toBe(false);
  });
});
