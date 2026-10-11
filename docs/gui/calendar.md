---
title: "Calendar module"
description: "A generic calendar with declared events, sources of events (quests, birthdays, weather), hooks and a calendar window, with @rpgjs/calendar."
---

# Calendar module

`@rpgjs/calendar` is an optional RPGJS v5 module. It keeps the **calendar of the world** (the date of today and
the events on it) and shows it in a window. It has no clock: your game moves the date, for example when the
player sleeps. A synchronized time system can drive it later without changing the API below.

The server owns the data. The client only displays what the server sends, and asks it for another month.

## Register it

```ts
// server.ts
import { provideCalendar } from "@rpgjs/calendar/server"
import { createServer, provideServerModules } from "@rpgjs/server"

export default createServer({
  providers: [
    provideCalendar({
      calendar: { seasons: ["spring", "summer", "autumn", "winter"] },
      today: { year: 1, month: 1, day: 3 },
    }),
    provideServerModules([]),
  ],
})
```

```ts
// client config: before provideClientModules()
import { provideCalendar } from "@rpgjs/calendar/client"
import { provideClientModules } from "@rpgjs/client"

export default {
  providers: [provideCalendar(), provideClientModules([])],
}
```

## The calendar

| Option | Default | |
| --- | --- | --- |
| `months` | `12` | Months of a year. |
| `daysPerMonth` | `30` | One number, or one number per month. |
| `weekdays` | `mon` … `sun` | Keys of the days, in display order. The first one starts the week. |
| `epochWeekday` | `0` | Index in `weekdays` of the first day of year 1. |
| `seasons` | none | Split evenly over the months. |

## Events

```ts
provideCalendar({
  categories: {
    market: { color: "#5fd16a", icon: "⚑" },
    combat: { color: "#ef5a4a", icon: "/icons/swords.png" },
  },
  events: [
    // A date: comes back every year because there is no `year`
    { id: "market", title: "Village Market", description: "Merchants gather.", category: "market",
      on: { month: 1, day: 7 } },
    // Every month: no `month`
    { id: "pay-day", title: "Pay day", on: { day: 1 } },
    // Every friday, only in summer
    { id: "arena", title: "Arena Challenge", category: "combat", every: { weekday: "fri" }, season: "summer" },
    // Several days, with the time and the place
    { id: "festival", title: "Spring Festival", on: { month: 1, day: 21 }, lasts: 3,
      from: "10:00", to: "22:00", map: "capital" },
  ],
})
```

- `title` and `description` are shown as they are, or translated when they start with `rpg.`.
- `icon` is an image URL or a path (`/icons/market.png`), or a short glyph (`⚑`). An event takes the icon and
  the color of its category when it has none.
- A multi-day event is listed on each of its days.
- An invalid event throws a readable error when it is added.

Add and remove events at runtime with `calendar.addEvent()` and `calendar.removeEvent(id)`.

## Sources

A source provides events for a range of dates. Use it for what the game already knows: quests, birthdays of
NPCs, the weather of the day.

```ts
calendar.addSource({
  id: "quests",
  scope: "player", // only asked for the player who opens the calendar
  // `getQuests()` stands for your own quest system
  list: ({ player, range, today }) =>
    player.getQuests().filter((quest) => quest.deadline).map((quest) => ({
      id: `quest-${quest.id}`, title: quest.name, category: "quest", on: quest.deadline,
    })),
})
```

- `world` sources (the default) are shown to everybody. `player` sources are only asked when a player opens
  the calendar, so one player's events never reach another.
- `list()` is called **once** each time the calendar is opened or another month is asked. It gets a range of
  about a year (the month and the events to come), so a source that reads a database should filter by `range`.
- A source that throws, or returns an invalid event, is logged and skipped: the calendar still opens.

## Move today and react

```ts
const calendar = inject(CalendarService)

await calendar.advance(1)            // tomorrow. { weeks: 1 } works too
await calendar.setToday({ year: 1, month: 2, day: 1 })
calendar.today()
```

```ts
provideCalendar({
  hooks: {
    onDayChange: ({ previous, current }) => {},
    onEventStart: ({ entry, date }) => {},  // today reached the first day of a world event
    onEventEnd: ({ entry, date }) => {},    // today passed its last day
  },
})
```

Hooks only see the events of the world. A hook that throws is logged and the others still run.

## Open the window

```ts
await calendar.open(player)               // resolves when the player closes it
await calendar.open(player, { month: 2 }) // another month
calendar.open(player, { waitForClose: false })
```

The player moves between months with the arrows, selects a day with the pointer or the movement keys (left and
right move by a day, up and down by a week), and closes the window with the close button or `escape`. The list on the right shows the events from the selected day on.

Add `import "@rpgjs/ui-css/index.css"` to get the styles. The catalogue of the GUI has the calendar in
**Compositions / Calendar**. Replace the window with `provideCalendar({ component })`; it receives the
`CalendarView` as `data`.

## Texts

Translate with `rpg.calendar.*` keys (English and French are included): `title`, `subtitle`, `events`,
`weekday.mon`…, `season.spring`…, `month.1`… A month is named by its `rpg.calendar.month.N` key when you give
one. Otherwise it shows its season, with its place when a season has several months (`Spring 2`).
