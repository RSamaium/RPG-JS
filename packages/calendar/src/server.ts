import { inject, type RpgPlayer } from "@rpgjs/server";
import { CalendarService } from "./service";
import type { CalendarOpenOptions } from "./server-types";

/**
 * Opens the calendar window of a player.
 *
 * Same as `inject(CalendarService).open(player)`.
 */
export function openCalendar(player: RpgPlayer, options?: CalendarOpenOptions): Promise<unknown> {
  return inject(CalendarService).open(player, options);
}

export { CalendarService };
