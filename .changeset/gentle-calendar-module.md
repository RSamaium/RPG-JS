---
"@rpgjs/calendar": minor
"@rpgjs/ui-css": minor
---

Add `@rpgjs/calendar`, a generic calendar module that works on its own (it has no clock: the game moves today's date). It gives a configurable calendar (months, weekdays, seasons), events that are declared (one date, a weekday, a number of days, a season) or that come from sources (quests, birthdays, weather…, per world or per player), hooks (`onDayChange`, `onEventStart`, `onEventEnd`) and a calendar window opened with `inject(CalendarService).open(player)`. `@rpgjs/ui-css` gets the matching `rpg-ui-calendar` styles and Storybook stories.
