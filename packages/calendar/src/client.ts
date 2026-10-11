import { RpgGui, inject, type RpgClient } from "@rpgjs/client";
import { defineModule } from "@rpgjs/common";
import { CALENDAR_GUI_ID } from "./config";
import type { CalendarClientOptions } from "./client-types";
// @ts-ignore CanvasEngine components are compiled by @canvasengine/compiler.
import CalendarComponent from "./components/calendar.ce";

export const CALENDAR_CLIENT_I18N = {
  en: {
    "rpg.calendar.title": "Calendar",
    "rpg.calendar.subtitle": "Check upcoming events and important dates.",
    "rpg.calendar.events": "Events",
    "rpg.calendar.previous": "Previous month",
    "rpg.calendar.next": "Next month",
    "rpg.calendar.year": "Year {year}",
    "rpg.calendar.day": "Day {day}",
    "rpg.calendar.day-in-month": "{month}/{day}",
    "rpg.calendar.day-in-year": "Year {year}, {month}/{day}",
    "rpg.calendar.month-number": "Month {month}",
    "rpg.calendar.empty": "Nothing planned",
    "rpg.calendar.empty-help": "Events and important dates will appear here.",
    "rpg.calendar.weekday.mon": "Mon",
    "rpg.calendar.weekday.tue": "Tue",
    "rpg.calendar.weekday.wed": "Wed",
    "rpg.calendar.weekday.thu": "Thu",
    "rpg.calendar.weekday.fri": "Fri",
    "rpg.calendar.weekday.sat": "Sat",
    "rpg.calendar.weekday.sun": "Sun",
    "rpg.calendar.season.spring": "Spring",
    "rpg.calendar.season.summer": "Summer",
    "rpg.calendar.season.autumn": "Autumn",
    "rpg.calendar.season.winter": "Winter",
  },
  fr: {
    "rpg.calendar.title": "Calendrier",
    "rpg.calendar.subtitle": "Consultez les événements à venir et les dates importantes.",
    "rpg.calendar.events": "Événements",
    "rpg.calendar.previous": "Mois précédent",
    "rpg.calendar.next": "Mois suivant",
    "rpg.calendar.year": "An {year}",
    "rpg.calendar.day": "Jour {day}",
    "rpg.calendar.day-in-month": "{day}/{month}",
    "rpg.calendar.day-in-year": "An {year}, {day}/{month}",
    "rpg.calendar.month-number": "Mois {month}",
    "rpg.calendar.empty": "Rien de prévu",
    "rpg.calendar.empty-help": "Les événements et les dates importantes apparaîtront ici.",
    "rpg.calendar.weekday.mon": "Lun",
    "rpg.calendar.weekday.tue": "Mar",
    "rpg.calendar.weekday.wed": "Mer",
    "rpg.calendar.weekday.thu": "Jeu",
    "rpg.calendar.weekday.fri": "Ven",
    "rpg.calendar.weekday.sat": "Sam",
    "rpg.calendar.weekday.sun": "Dim",
    "rpg.calendar.season.spring": "Printemps",
    "rpg.calendar.season.summer": "Été",
    "rpg.calendar.season.autumn": "Automne",
    "rpg.calendar.season.winter": "Hiver",
  },
};

export function createCalendarClient(options: CalendarClientOptions = {}): RpgClient {
  return defineModule<RpgClient>({
    i18n: CALENDAR_CLIENT_I18N,
    gui: [{
      id: CALENDAR_GUI_ID,
      component: options.component || CalendarComponent,
      renderer: options.renderer ?? "canvas",
      autoDisplay: false,
    }],
  });
}

/** Closes the calendar window on this client. */
export function closeCalendar(): void {
  inject(RpgGui).hide(CALENDAR_GUI_ID);
}

export default createCalendarClient();
