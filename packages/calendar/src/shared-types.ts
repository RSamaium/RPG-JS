/** Day of a calendar, 1-based (`month` and `day` start at 1). */
export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

/** A date with the data derived from the calendar. */
export interface CalendarDateInfo extends CalendarDate {
  /** Index in `weekdays`, `0` is the first day of the week. */
  weekday: number;
  /** Key of the day of the week (`mon`, `tue`…). */
  weekdayKey: string;
  season?: string;
}

export interface CalendarConfig {
  /** Number of months of a year. Default `12`. */
  months?: number;
  /** Days of every month, or one value per month. Default `30`. */
  daysPerMonth?: number | number[];
  /**
   * Keys of the days of the week, in display order: the first one starts the week.
   * Default `mon` to `sun`. The length is the number of days of a week.
   */
  weekdays?: string[];
  /** Index in `weekdays` of the first day of year 1. Default `0`. */
  epochWeekday?: number;
  /** Seasons, split evenly over the months. */
  seasons?: string[];
}

export interface ResolvedCalendarConfig {
  months: number;
  daysPerMonth: number[];
  weekdays: string[];
  epochWeekday: number;
  seasons: string[];
}

export interface CalendarCategory {
  /** CSS color of the dot of the category. */
  color?: string;
  /** Default image of the events of the category. */
  icon?: string;
  /** Label, or an i18n key (`rpg.` prefix). */
  label?: string;
}

export interface CalendarEventOn {
  /** Omit it for an event that comes back every year. */
  year?: number;
  /** Omit it for an event that comes back every month. */
  month?: number;
  day: number;
}

export interface CalendarEventEvery {
  /** Key (`fri`) or index of the day of the week. */
  weekday: string | number;
  /** Restricts the event to one month. */
  month?: number;
}

export interface CalendarEventDefinition {
  id: string;
  /** Title, or an i18n key (`rpg.` prefix). */
  title: string;
  description?: string;
  category?: string;
  /** Image id or URL. Falls back to the icon of the category. */
  icon?: string;
  /** A date, yearly when `year` is omitted. */
  on?: CalendarEventOn;
  /** A weekly recurrence. */
  every?: CalendarEventEvery;
  /** Number of days the event lasts. Default `1`. */
  lasts?: number;
  /** Restricts a recurrence to a season. */
  season?: string;
  /** Time of the day, `HH:MM`. */
  from?: string;
  to?: string;
  /** Map where the event takes place. */
  map?: string;
}

/** An event on one date, resolved from a definition or a source. */
export interface CalendarEntry {
  id: string;
  title: string;
  description?: string;
  category?: string;
  icon?: string;
  color?: string;
  /** First day of this occurrence. */
  date: CalendarDate;
  /** Last day of this occurrence, same as `date` for a one day event. */
  endDate: CalendarDate;
  from?: string;
  to?: string;
  map?: string;
  scope: "world" | "player";
  /** Id of the source that returned the entry, `events` for the declared ones. */
  source: string;
}

export interface CalendarRange {
  from: CalendarDate;
  to: CalendarDate;
}

export interface CalendarSourceContext<TPlayer = unknown> {
  player?: TPlayer;
  range: CalendarRange;
  today: CalendarDateInfo;
}

/** A provider of events: quests, birthdays, weather… */
export interface CalendarSource<TPlayer = unknown> {
  id: string;
  /** `player` sources are resolved for the player who opens the calendar only. Default `world`. */
  scope?: "world" | "player";
  list(context: CalendarSourceContext<TPlayer>): CalendarSourceEvent[] | Promise<CalendarSourceEvent[]>;
}

/** An event returned by a source: a definition with a date. */
export type CalendarSourceEvent = CalendarEventDefinition;
