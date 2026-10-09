import type {
  CalendarCategory,
  CalendarConfig,
  CalendarDate,
  CalendarDateInfo,
  CalendarEntry,
  CalendarSource,
} from "./shared-types";

/** The part of a player the calendar needs: opening its window. */
export interface CalendarPlayerLike {
  gui(id: string): {
    open(data?: unknown, options?: { waitingAction?: boolean; blockPlayerInput?: boolean }): Promise<unknown>;
    on<T = unknown>(event: string, callback: (data: T) => unknown | Promise<unknown>): void;
    update(data?: unknown): void;
  };
}

export interface CalendarDayChangePayload {
  previous: CalendarDateInfo;
  current: CalendarDateInfo;
}

export interface CalendarEventPayload {
  entry: CalendarEntry;
  /** Today, when the event started or ended. */
  date: CalendarDateInfo;
}

export interface CalendarHooks {
  onDayChange?(payload: CalendarDayChangePayload): unknown;
  /** Called when today reaches the first day of a world event. */
  onEventStart?(payload: CalendarEventPayload): unknown;
  /** Called when today passes the last day of a world event. */
  onEventEnd?(payload: CalendarEventPayload): unknown;
}

export interface CalendarServerOptions<TPlayer = unknown> {
  calendar?: CalendarConfig;
  /** First date of the world. Default: year 1, month 1, day 1. */
  today?: CalendarDate;
  categories?: Record<string, CalendarCategory>;
  /** Events declared in the game. */
  events?: import("./shared-types").CalendarEventDefinition[];
  /** Providers of dynamic events (quests, birthdays, weather…). */
  sources?: CalendarSource<TPlayer>[];
  hooks?: CalendarHooks;
  /** Events listed next to the month. Default `6`. */
  upcomingLimit?: number;
}

export interface CalendarOpenOptions extends Partial<CalendarDate> {
  /** Selected day. Default: today. */
  selected?: Partial<CalendarDate>;
  /** Resolve the promise when the window closes. Default `true`. */
  waitForClose?: boolean;
}

/** What the window displays, serialized to the client. */
export interface CalendarView {
  today: CalendarDateInfo;
  year: number;
  month: number;
  season?: string;
  /** Place of the month in its season, to tell the months of one season apart. */
  monthInSeason?: { index: number; count: number };
  months: number;
  weekdays: string[];
  /** Index in `weekdays` of the first day of the month. */
  firstWeekday: number;
  daysInMonth: number;
  /** Entries of every day of the month that has some. A multi-day event is listed on each of its days. */
  days: Record<number, CalendarEntry[]>;
  selected: CalendarDate;
  /** Entries from the selected day on, in date order. */
  upcoming: CalendarEntry[];
  categories: Record<string, CalendarCategory>;
}
