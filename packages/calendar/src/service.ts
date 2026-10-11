import {
  addDays,
  compareDates,
  daysInMonth,
  describeDate,
  monthInSeason,
  fromOrdinal,
  normalizeDate,
  resolveCalendarConfig,
  toOrdinal,
  weekdayIndex,
} from "./dates";
import { normalizeEventDefinition, resolveEntries } from "./events";
import { CALENDAR_GUI_ID, CALENDAR_VIEW_INTERACTION } from "./config";
import type {
  CalendarOpenOptions,
  CalendarPlayerLike,
  CalendarServerOptions,
  CalendarView,
} from "./server-types";
import type {
  CalendarCategory,
  CalendarDate,
  CalendarDateInfo,
  CalendarEntry,
  CalendarEventDefinition,
  CalendarRange,
  CalendarSource,
  ResolvedCalendarConfig,
} from "./shared-types";

const DEFAULT_UPCOMING = 6;
/** Days looked at to list the events to come. */
const UPCOMING_WINDOW_DAYS = 366;

/**
 * The calendar of the world: the date of today, the events and the providers of events.
 *
 * It has no clock: the game moves the date with `setToday()` and `advance()`.
 */
export class CalendarService<TPlayer extends CalendarPlayerLike = CalendarPlayerLike> {
  private options: CalendarServerOptions<TPlayer> = {};
  private resolved: ResolvedCalendarConfig = resolveCalendarConfig();
  private todayDate: CalendarDate = { year: 1, month: 1, day: 1 };
  private definitions = new Map<string, CalendarEventDefinition>();
  private sources = new Map<string, CalendarSource<TPlayer>>();
  private categories: Record<string, CalendarCategory> = {};

  constructor(options: CalendarServerOptions<TPlayer> = {}) {
    this.configure(options);
  }

  configure(options: CalendarServerOptions<TPlayer> = {}): void {
    this.options = options;
    this.resolved = resolveCalendarConfig(options.calendar);
    this.todayDate = normalizeDate(this.resolved, options.today ?? { year: 1, month: 1, day: 1 });
    this.categories = { ...(options.categories ?? {}) };
    this.definitions.clear();
    this.sources.clear();
    for (const definition of options.events ?? []) this.addEvent(definition);
    for (const source of options.sources ?? []) this.addSource(source);
  }

  get config(): ResolvedCalendarConfig {
    return this.resolved;
  }

  today(): CalendarDateInfo {
    return describeDate(this.resolved, this.todayDate);
  }

  /** Moves today to a date. Calls `onDayChange` and the event hooks when the date changed. */
  async setToday(date: CalendarDate): Promise<CalendarDateInfo> {
    const previous = this.today();
    this.todayDate = normalizeDate(this.resolved, date);
    const current = this.today();
    if (compareDates(this.resolved, previous, current) !== 0) {
      await this.dispatchDayChange(previous, current);
    }
    return current;
  }

  /** Moves today forward by a number of days (`advance(1)` is tomorrow). */
  advance(days: number | { days?: number; weeks?: number } = 1): Promise<CalendarDateInfo> {
    const amount = typeof days === "number"
      ? days
      : (days.days ?? 0) + (days.weeks ?? 0) * this.resolved.weekdays.length;
    return this.setToday(addDays(this.resolved, this.todayDate, amount));
  }

  addEvent(definition: CalendarEventDefinition): void {
    const normalized = normalizeEventDefinition(definition, this.resolved);
    this.definitions.set(normalized.id, normalized);
  }

  removeEvent(id: string): boolean {
    return this.definitions.delete(id);
  }

  addSource(source: CalendarSource<TPlayer>): void {
    if (!source?.id || typeof source.list !== "function") {
      throw new Error("Calendar source: `id` and `list()` are required.");
    }
    this.sources.set(source.id, source);
  }

  removeSource(id: string): boolean {
    return this.sources.delete(id);
  }

  /**
   * Events that overlap a range. `player` sources are only asked when a player is given, so an entry
   * that belongs to one player never reaches another.
   */
  async entries(range: CalendarRange, player?: TPlayer): Promise<CalendarEntry[]> {
    const config = this.resolved;
    const found = resolveEntries(config, [...this.definitions.values()], range, { categories: this.categories });
    const today = this.today();
    for (const source of this.sources.values()) {
      const scope = source.scope ?? "world";
      if (scope === "player" && !player) continue;
      let events: CalendarEventDefinition[];
      try {
        events = (await source.list({ player: scope === "player" ? player : undefined, range, today })) ?? [];
      } catch (error) {
        console.error(`[RPGJS] Calendar source "${source.id}" failed:`, error);
        continue;
      }
      const valid: CalendarEventDefinition[] = [];
      for (const event of events) {
        try {
          valid.push(normalizeEventDefinition(event, config));
        } catch (error) {
          console.error(`[RPGJS] Calendar source "${source.id}" returned an invalid event:`, (error as Error).message);
        }
      }
      found.push(...resolveEntries(config, valid, range, { categories: this.categories, scope, source: source.id }));
    }
    return found.sort((a, b) => compareDates(config, a.date, b.date) || a.title.localeCompare(b.title));
  }

  /** Events from a date on (today by default), at most `limit`. */
  async upcoming(
    from: CalendarDate = this.todayDate,
    options: { limit?: number; days?: number; player?: TPlayer } = {},
  ): Promise<CalendarEntry[]> {
    const start = normalizeDate(this.resolved, from);
    const end = addDays(this.resolved, start, options.days ?? UPCOMING_WINDOW_DAYS);
    const entries = await this.entries({ from: start, to: end }, options.player);
    return entries.slice(0, options.limit ?? this.options.upcomingLimit ?? DEFAULT_UPCOMING);
  }

  /** What the calendar window displays for a month. */
  async view(player: TPlayer | undefined, request: CalendarOpenOptions = {}): Promise<CalendarView> {
    const config = this.resolved;
    const today = this.today();
    const month = normalizeDate(config, {
      year: request.year ?? today.year,
      month: request.month ?? today.month,
      day: 1,
    });
    const selected = normalizeDate(config, {
      year: request.selected?.year ?? month.year,
      month: request.selected?.month ?? month.month,
      day: request.selected?.day ?? (month.year === today.year && month.month === today.month ? today.day : 1),
    });
    const length = daysInMonth(config, month.month);
    const monthStart = { ...month, day: 1 };
    const monthEnd = { ...month, day: length };
    // One query for the month and the events to come: a source is asked once per view.
    const limit = this.options.upcomingLimit ?? DEFAULT_UPCOMING;
    const windowEnd = addDays(config, selected, UPCOMING_WINDOW_DAYS);
    const from = compareDates(config, monthStart, selected) <= 0 ? monthStart : selected;
    const to = compareDates(config, monthEnd, windowEnd) >= 0 ? monthEnd : windowEnd;
    const entries = await this.entries({ from, to }, player);
    const first = toOrdinal(config, monthStart);
    const last = first + length - 1;
    const days: Record<number, CalendarEntry[]> = {};
    for (const entry of entries) {
      const start = Math.max(toOrdinal(config, entry.date), first);
      const end = Math.min(toOrdinal(config, entry.endDate), last);
      for (let ordinal = start; ordinal <= end; ordinal += 1) {
        (days[fromOrdinal(config, ordinal).day] ??= []).push(entry);
      }
    }
    const selectedOrdinal = toOrdinal(config, selected);
    const upcoming = entries
      .filter((entry) => toOrdinal(config, entry.endDate) >= selectedOrdinal)
      .slice(0, limit);
    return {
      today,
      year: month.year,
      month: month.month,
      season: describeDate(config, month).season,
      monthInSeason: monthInSeason(config, month.month),
      months: config.months,
      weekdays: config.weekdays,
      firstWeekday: weekdayIndex(config, { ...month, day: 1 }),
      daysInMonth: length,
      days,
      selected,
      upcoming,
      categories: this.categories,
    };
  }

  /** Opens the calendar window of a player. The promise resolves when it is closed. */
  async open(player: TPlayer, options: CalendarOpenOptions = {}): Promise<unknown> {
    const gui = player.gui(CALENDAR_GUI_ID);
    gui.on<CalendarOpenOptions>(CALENDAR_VIEW_INTERACTION, async (request) => {
      gui.update(await this.view(player, request ?? {}));
    });
    return gui.open(await this.view(player, options), {
      waitingAction: options.waitForClose !== false,
      blockPlayerInput: true,
    });
  }

  private async dispatchDayChange(previous: CalendarDateInfo, current: CalendarDateInfo): Promise<void> {
    const { hooks } = this.options;
    if (!hooks) return;
    await this.callHook("onDayChange", () => hooks.onDayChange?.({ previous, current }));
    if (!hooks.onEventStart && !hooks.onEventEnd) return;
    const config = this.resolved;
    const before = toOrdinal(config, previous);
    const now = toOrdinal(config, current);
    // Only the events of the world: the ones of a player are not known here.
    const entries = await this.entries({ from: fromOrdinal(config, Math.max(0, Math.min(before, now) - 366)), to: current });
    for (const entry of entries) {
      const start = toOrdinal(config, entry.date);
      const end = toOrdinal(config, entry.endDate);
      if (hooks.onEventStart && start > before && start <= now) {
        await this.callHook("onEventStart", () => hooks.onEventStart!({ entry, date: current }));
      }
      if (hooks.onEventEnd && end >= before && end < now) {
        await this.callHook("onEventEnd", () => hooks.onEventEnd!({ entry, date: current }));
      }
    }
  }

  private async callHook(name: string, call: () => unknown): Promise<void> {
    try {
      await call();
    } catch (error) {
      console.error(`[RPGJS] Calendar ${name} hook failed:`, error);
    }
  }
}
