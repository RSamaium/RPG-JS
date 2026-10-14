import { createModule, type RpgProvider } from "@rpgjs/common";
import client, { CALENDAR_CLIENT_I18N, closeCalendar, createCalendarClient } from "./client";
import type { CalendarClientOptions } from "./client-types";

export { CALENDAR_GUI_ID, CALENDAR_VIEW_INTERACTION } from "./config";
export { CALENDAR_CLIENT_I18N, closeCalendar, createCalendarClient };
export type { CalendarClientOptions } from "./client-types";
export type * from "./shared-types";
export type { CalendarView } from "./server-types";

/** Registers the calendar window on the client. */
export function provideCalendar(options: CalendarClientOptions = {}): RpgProvider[] {
  return createModule("Calendar", [{ client: createCalendarClient(options) }]);
}

export default { client };
