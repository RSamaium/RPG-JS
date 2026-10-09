import type { RpgProvider } from "@rpgjs/common";
import { CalendarService } from "./service";
import { openCalendar } from "./server";
import type { CalendarServerOptions } from "./server-types";

export { CALENDAR_GUI_ID, CALENDAR_VIEW_INTERACTION } from "./config";
export { CalendarService, openCalendar };
export type * from "./shared-types";
export type * from "./server-types";

/**
 * Registers the calendar of the world on the server.
 *
 * ```ts
 * provideCalendar({
 *   calendar: { seasons: ["spring", "summer", "autumn", "winter"] },
 *   events: [{ id: "market", title: "Village Market", on: { month: 1, day: 7 } }],
 * })
 * ```
 *
 * Then `inject(CalendarService)` gives the service (`setToday()`, `advance()`, `addEvent()`…).
 */
export function provideCalendar<TPlayer extends import("./server-types").CalendarPlayerLike = import("./server-types").CalendarPlayerLike>(
  options: CalendarServerOptions<TPlayer> = {},
): RpgProvider[] {
  return [{ provide: CalendarService, useValue: new CalendarService<TPlayer>(options) }];
}

export default {};
