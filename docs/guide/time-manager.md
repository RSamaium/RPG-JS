---
title: "Time Manager"
description: "Guide for synchronized game time, calendars, and optional lighting in RPGJS."
---

# Time Manager

Use `withTimeManager()` to add synchronized game time without adding methods to `RpgMap`.

The server owns the canonical time. The client receives a map snapshot and infers the displayed time locally from `elapsedMinutes`, `scale`, `paused`, and `serverTimestamp`.

## Register the Module

You can use the same module object on both sides:

```ts
// modules/time.ts
import { withTimeManager } from '@rpgjs/common'

export const TimeManagerModule = withTimeManager({
  start: '0001-01-01 08:00',
  scale: 10,
  calendar: {
    months: 12,
    daysPerMonth: 30,
    daysPerWeek: 7,
    seasons: ['spring', 'summer', 'autumn', 'winter']
  },
  lighting: {
    enabled: true
  }
})
```

```ts
// server.ts
import { provideServerModules } from '@rpgjs/server'
import { TimeManagerModule } from './modules/time'

provideServerModules([
  TimeManagerModule
])
```

```ts
// client.ts
import { provideClientModules } from '@rpgjs/client'
import { TimeManagerModule } from './modules/time'

provideClientModules([
  TimeManagerModule
])
```

For a client-only declaration, this also works:

```ts
provideClientModules([
  withTimeManager()
])
```

## Server API

Use `TimeManager` from server hooks, events, or services:

```ts
import { TimeManager, inject } from '@rpgjs/server'

const time = inject(TimeManager)

time.set({ hour: 22, minute: 30 })
time.advance({ hours: 2 })
time.pause()
time.resume()
time.setScale(30)
```

Read the derived state:

```ts
const now = time.state()

console.log(now.year, now.month, now.day)
console.log(now.hour, now.minute, now.weekday, now.season)
```

## Client API

Use `ClientTimeManager` for display logic:

```ts
import { ClientTimeManager, inject } from '@rpgjs/client'

const time = inject(ClientTimeManager)
const now = time.state()

if (now) {
  console.log(`${now.hour}:${String(now.minute).padStart(2, '0')}`)
}
```

The client does not write time. It projects the current display value from the last synchronized map snapshot.

## Snapshot

The synchronized map field is internal and namespaced:

```ts
{
  __rpgjsTime: {
    elapsedMinutes: 480,
    scale: 10,
    paused: false,
    serverTimestamp: 1783013400000,
    calendar: {
      months: 12,
      daysPerMonth: 30,
      daysPerWeek: 7,
      seasons: ['spring', 'summer', 'autumn', 'winter']
    }
  }
}
```

Game code should use `TimeManager` and `ClientTimeManager` instead of reading `__rpgjsTime` directly.

## Lighting

When `lighting.enabled` is true, the server can apply map lighting from time phases:

```ts
withTimeManager({
  lighting: {
    enabled: true,
    transitionMs: 1500,
    phases: {
      dawn: { hour: 6, lighting: { ambient: { darkness: 0.2 } } },
      day: { hour: 8, lighting: { ambient: { darkness: 0 } } },
      dusk: { hour: 18, lighting: { ambient: { darkness: 0.25 } } },
      night: { hour: 21, lighting: { ambient: { darkness: 0.55 } } }
    }
  }
})
```

If lighting is omitted or disabled, the time manager does not modify map lighting.

## Weather Ambiences

When `weather.enabled` is true, the server can roll weather ambiences per map. Each ambience has a weight and a game-time duration. When the duration expires, the server rolls the next ambience and applies it with the existing map weather API.

```ts
withTimeManager({
  weather: {
    enabled: true,
    default: {
      ambiences: {
        clear: {
          weather: null,
          weight: { default: 60, months: { 6: 80, 7: 85, 8: 80 } },
          duration: { min: { hours: 2 }, max: { hours: 6 } }
        },
        rain: {
          weather: {
            effect: 'rain',
            preset: 'steadyRain',
            params: { density: 220, speed: 0.7 },
            transitionMs: 900
          },
          weight: { default: 20, months: { 3: 45, 4: 50, 10: 40, 11: 45 } },
          duration: { min: { hours: 1 }, max: { hours: 4 } }
        },
        fog: {
          weather: {
            effect: 'fog',
            preset: 'morningFog',
            params: { density: 0.8, alpha: 0.45 }
          },
          weight: { default: 10, seasons: { autumn: 30, winter: 20 } },
          duration: { hours: 2 }
        }
      }
    },
    maps: {
      forest: {
        ambiences: {
          rain: {
            weather: { effect: 'rain', params: { density: 260 } },
            weight: 100,
            duration: { hours: 2 }
          }
        }
      }
    }
  }
})
```

`maps[mapId]` overrides the `default` weather table for that map. A `weather: null` ambience clears the map weather. If weather is omitted, disabled, or no table exists for a map, the time manager does not modify that map's weather.

Weather remains server-owned. Clients receive the regular `weatherState` map update and should read `engine.sceneMap.weather()` or `engine.sceneMap.getWeather()` for rendering.
