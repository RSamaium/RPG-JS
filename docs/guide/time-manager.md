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

## Units and limits

| Option | Unit |
| --- | --- |
| `scale` | Game minutes per **real minute** (`1` is real time, `60` is one game hour per real minute). |
| `useGameClock({ speed })` of CanvasEngine | Game minutes per real **second**: divide `scale` by 60. |

There is **one clock for the whole server**: every map shares the same time, and `pause()` or `set()` applies to all of them. To keep a map out of the day night cycle (a cave, an interior), see [Per map lighting](#per-map-lighting).

## Clock on screen

`hud` draws the clock on the client: a pill with the day and the hour, and a round medallion whose sky follows the
hour (a sun that crosses it, a moon and stars at night, colors that change at dawn and dusk). It is off by default.

```ts
withTimeManager({
  scale: 10,
  hud: { position: "top-right", fastScale: 1000 }, // or `hud: true`
})
```

| Option | Default | |
| --- | --- | --- |
| `position` | `top-right` | `top-left`, `top-right`, `bottom-left` or `bottom-right`. |
| `size` | `default` | `compact` shows the medallion only. |
| `fastScale` | none | Shows the fast forward badge from this `scale` on. A paused clock always shows its badge. |

The client must register the same module (`provideClientModules([TimeManagerModule])`) and load the styles
(`import "@rpgjs/ui-css/index.css"`). "Day N" counts the days since the start. The texts are the `rpg.time.*`
keys (English and French are included). The catalogue of the GUI has it in **Compositions / Game clock**.

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

A phase is merged into the lighting of the map: the light spots, the shadows and the other keys that the phase does not set are kept.

If lighting is omitted or disabled, the time manager does not modify map lighting.

### Day night cycle

Use `dayNight` to replace the phases by the continuous color grading of the `DayNightCycle` preset. The scene follows the hour of the time manager and the `spots` of the map are lit at night (see [Lighting](./lighting.md#day-night-cycle)):

```ts
withTimeManager({
  scale: 10,
  lighting: {
    enabled: true,
    dayNight: { lightIntensity: 1.2, vignette: 1 } // or `true`
  }
})
```

Two sets of phases exist, do not mix them up:

| Mode | Keys | Boundaries |
| --- | --- | --- |
| `phases` | Your own keys | The hours you give (`hour: 21`). |
| `dayNight` | `night`, `dawn`, `day`, `dusk` | 0h, 5h, 7h30, 17h30 and 20h30, like the `DayNightCycle` preset. |

The hooks `onLightingPhaseChange` and `onPhaseChange` (the same transition, the second one reads better for gameplay rules) receive those keys. The state exposes them too: `state.phase` and `state.hourFloat` (the hour with decimals, `18.5` is 18:30).

### Per map lighting

The time manager lights every registered map. Override or disable it per map, like `weather.maps`:

```ts
withTimeManager({
  lighting: {
    enabled: true,
    dayNight: true,
    maps: {
      cave: false,                                      // untouched
      tavern: { dayNight: { lightIntensity: 1.4 } }     // other options for this map
    }
  }
})
```

A map can also opt out on its own side, in its `lighting`:

```ts
{ id: 'house', lighting: { dayNight: { enabled: false }, ambient: { darkness: 0.3 } } }
```

### Client module

The client must register the same module (`provideClientModules([TimeManagerModule])`). Without it the client falls back to a local clock and shows the wrong hour: a warning is logged in the console when the server drives the cycle with the time manager.

The client projects the time from the clock of the server, so a client whose clock is off still shows the same hour as the other players.

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

## Environment Hooks

Use `hooks` on `withTimeManager()` when the environment should drive gameplay rules from the plugin itself:

```ts
withTimeManager({
  hooks: {
    onDayChange({ map, current }) {
      console.log(`New day ${current.day}`)
    },
    onLightingPhaseChange({ previousKey, currentKey }) {
      console.log(`${previousKey} -> ${currentKey}`)
    },
    onBeforeWeatherChange({ candidate, time }) {
      if (time.season === 'summer' && candidate.key === 'snow') {
        return false
      }
    },
    onWeatherChange({ currentKey }) {
      console.log(`Weather is now ${currentKey}`)
    }
  }
})
```

`onBeforeWeatherChange()` can return `false` to cancel the roll, or another `{ key, ambience }` candidate to replace it. Initial map registration is silent: hooks run only after an actual time, lighting, or weather transition.

Transition payloads include the current map so plugin hooks can update synchronized map state or trigger map-local systems.

Events can react locally by declaring matching methods:

```ts
import { EventData, RpgEvent } from '@rpgjs/server'
import type { TimeWeatherTransitionPayload } from '@rpgjs/common'

@EventData({ name: 'Crop' })
export class CropEvent extends RpgEvent {
  onDayChange() {
    this.setGraphic('crop-stage-2')
  }

  onWeatherChange(payload: TimeWeatherTransitionPayload) {
    if (payload.currentKey === 'rain') {
      this.setGraphic('crop-watered')
    }
  }
}
```

Global event hooks work too:

```ts
const server = {
  event: {
    onWeatherChange(event, payload) {
      if (payload.currentKey === 'rain') {
        event.setGraphic('crop-watered')
      }
    }
  }
}
```

This keeps the environment logic centralized in the time plugin while still letting map events behave like Stardew Valley objects: crops grow on day changes, lamps react to lighting phases, and NPCs or interactables react to weather changes.
