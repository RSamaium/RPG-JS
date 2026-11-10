# @rpgjs/calendar

## 5.1.2

### Patch Changes

- 10e24d8: Update CanvasEngine: `canvasengine` 2.5.1, `@canvasengine/compiler` and `@canvasengine/presets` 2.5.0. `@canvasengine/tiled` and `@canvasengine/testing` stay on 2.4.1, the latest published versions.

  Action Battle enemy loot pops right on defeat again: CanvasEngine 2.5.1 replays the updates made during the impact freeze (hit-stop), so the loot no longer waits for its end.

## 5.1.1

### Patch Changes

- cd51839: Update CanvasEngine to 2.4.1.

## 5.1.0

### Minor Changes

- 0380564: Add `@rpgjs/calendar`, a generic calendar module that works on its own (it has no clock: the game moves today's date). It gives a configurable calendar (months, weekdays, seasons), events that are declared (one date, a weekday, a number of days, a season) or that come from sources (quests, birthdays, weather…, per world or per player), hooks (`onDayChange`, `onEventStart`, `onEventEnd`) and a calendar window opened with `inject(CalendarService).open(player)`. `@rpgjs/ui-css` gets the matching `rpg-ui-calendar` styles and Storybook stories.
