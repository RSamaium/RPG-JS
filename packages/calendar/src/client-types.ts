export interface CalendarClientOptions {
  /** Replaces the calendar window. It receives the `CalendarView` as `data`. */
  component?: unknown;
  renderer?: "canvas" | "vue";
}
