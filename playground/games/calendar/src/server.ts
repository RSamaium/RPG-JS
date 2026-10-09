import { createServer, provideServerModules } from "@rpgjs/server";
import { provideCalendar } from "@rpgjs/calendar/server";
import town from "./modules/calendar/server";
import { calendarOptions } from "./modules/calendar/options";

export default createServer({
  providers: [
    provideCalendar(calendarOptions),
    provideServerModules([town]),
  ],
});
