# @rpgjs/calendar

A generic calendar for RPGJS v5: a configurable calendar, events (declared or provided by sources),
hooks, and a calendar window. It does not depend on any clock: the game moves today's date.

```bash
npm install @rpgjs/calendar @rpgjs/ui-css
```

## Register it

The server owns the calendar of the world:

```ts
import { provideCalendar } from "@rpgjs/calendar/server"
import { createServer, provideServerModules } from "@rpgjs/server"

export default createServer({
  providers: [
    provideCalendar({
      calendar: { seasons: ["spring", "summer", "autumn", "winter"] },
      today: { year: 1, month: 1, day: 3 },
      categories: { market: { color: "#5fd16a", icon: "⚑" } },
      events: [
        { id: "market", title: "Village Market", category: "market", on: { month: 1, day: 7 } },
      ],
    }),
    provideServerModules([]),
  ],
})
```

The client registers the window. Put it **before** `provideClientModules()`:

```ts
import { provideCalendar } from "@rpgjs/calendar/client"
import { provideClientModules } from "@rpgjs/client"

export default {
  providers: [provideCalendar(), provideClientModules([])],
}
```

Import the styles: `import "@rpgjs/ui-css/index.css"`.

## Use it

```ts
import { inject } from "@rpgjs/server"
import { CalendarService } from "@rpgjs/calendar/server"

const calendar = inject(CalendarService)

await calendar.open(player)        // the window, resolves when it closes
await calendar.advance(1)          // tomorrow
await calendar.setToday({ year: 1, month: 2, day: 1 })
calendar.today()                   // { year, month, day, weekday, weekdayKey, season }
```

See the [calendar guide](https://docs.rpgjs.dev/gui/calendar.html) for events, sources and hooks.
