---
title: "Weather"
description: "Guide for Weather in RPGJS."
---

# Weather

Manage map weather from the server while keeping a client-side override for local effects.

## Shared Types

Weather types are exported by `@rpgjs/common`:

```ts
import type { WeatherState, WeatherEffect, WeatherParams } from '@rpgjs/common'
```

Every weather effect of CanvasEngine (`@canvasengine/presets`) is supported:

| Effect | Presets |
| --- | --- |
| `rain` | `lightRain`, `steadyRain`, `stormRain` |
| `snow` | `lightSnow`, `winterSnow`, `blizzardSnow` |
| `fog` | `rpgMorningMist`, `rpgForestFog`, `rpgSwampFog`, `rpgNightFog`, `rpgHeavyFog` |
| `cloud` | `lightClouds`, `overcastClouds`, `stormClouds`, `goldenHourRays`, `sunnySoftRays`, `sunsetTwinkleRays`, `dramaticCrepuscularRays`, `morningHazeRays`, `naturalClouds` |
| `rays` | `morningSunRays`, `goldenHourShafts`, `forestLightShafts`, `moonbeams`, `holyRays`, `radiantBeams` |
| `embers` | `volcanoEmbers`, `eruptionEmbers` |
| `ash` | `ashfall` |
| `leaves` | `autumnLeaves`, `autumnGust` |
| `petals` | `sakuraPetals`, `sakuraStorm` |
| `fireflies` | `summerFireflies`, `swampFireflies` |
| `spores` | `forestSpores`, `enchantedSpores` |
| `sand` | `dustWind`, `sandstorm` |

`effect` can also be the id of a [custom weather](#custom-weather). The catalog
is exported by `@rpgjs/common` without importing the renderer, so an editor or a
server can list it:

```ts
import { WEATHER_EFFECTS, WEATHER_PRESET_EFFECTS, getWeatherPresetEffect } from '@rpgjs/common'

getWeatherPresetEffect('moonbeams') // 'rays'
```

## Presets And Params

A weather state can name only a `preset`; `effect` is then the one of the preset.
`params` override the values of the preset. All `params` are forwarded to
CanvasEngine's `<Weather>` as they are, so a parameter added by a newer
CanvasEngine works without a new RPGJS release (`rayFan`, `rayLength`, `rayColor`,
`fogOpacity`, `colors`, `particleSize`, `haze`, `topDown`, ...).

```ts
map.setWeather({ preset: 'moonbeams' })

map.setWeather({
  effect: 'embers',
  params: { colors: ['#ff6a00'], particleSize: 1.4 }
})
```

An unknown preset or effect is reported once in the console and renders nothing.

## Initial Map Weather

Set initial weather in `@MapData()` or in a map entry inside your server module:

```ts
import { MapData, RpgMap } from '@rpgjs/server'

@MapData({
  id: 'forest',
  file: require('./tmx/forest.tmx'),
  weather: {
    effect: 'fog',
    preset: 'rpgForestFog',
    params: {
      density: 1.2,
      height: 0.75
    },
    transitionMs: 1200
  }
})
export class ForestMap extends RpgMap {}
```

## Runtime API (Server)

`RpgMap` exposes:

- `map.getWeather(): WeatherState | null`
- `map.setWeather(next: WeatherState | null, options?: { sync?: boolean })`
- `map.patchWeather(patch: Partial<WeatherState>, options?: { sync?: boolean })`
- `map.clearWeather(options?: { sync?: boolean })`

Example:

```ts
map.setWeather({
  effect: 'rain',
  preset: 'steadyRain',
  params: {
    density: 220,
    speed: 0.7,
    windStrength: 0.25
  },
  transitionMs: 900,
  startedAt: Date.now()
})

map.patchWeather({
  params: {
    density: 280
  }
})
```

`patchWeather()` merges `params`. A patch that names a new `preset` (or a new `effect`)
replaces the previous one, so the old effect never overrides the effect of the new preset.

When `sync` is not `false`, the weather is broadcast to players in the map.

A synchronized `null` is authoritative: `clearWeather()` removes an initial
weather effect declared in the map data in both standalone and MMORPG modes.

## Runtime API (Client)

`RpgClientMap` exposes:

- `map.weatherState` (server-synchronized state)
- `map.localWeatherOverride` (client-only override)
- `map.weather` (computed: local override first, then server state, then map-data fallback before the first synchronization)
- `map.getWeather()`
- `map.setLocalWeather(next)`
- `map.clearLocalWeather()`

Example:

```ts
const weather = engine.sceneMap.getWeather()

engine.sceneMap.setLocalWeather({
  effect: 'cloud',
  params: {
    density: 0.8,
    sunIntensity: 1.2
  }
})
```

## Custom Weather

Register a weather component by id in a client module, like `componentAnimations`:

```ts
import { defineModule, RpgClient } from '@rpgjs/client'
import AuroraWeather from './aurora.ce'

defineModule<RpgClient>({
  weathers: [
    { id: 'aurora', component: AuroraWeather }
  ]
})
```

```ts
// server
map.setWeather({ effect: 'aurora', params: { intensity: 0.8 } }, { transitionMs: 2000 })
```

When `effect` matches a registered id, the scene renders that component instead of
`<Weather>`, in the same layer (`params.zIndex`, 1000 by default). It receives
`effect`, `params`, `transitionMs`, `durationMs`, `startedAt` and `seed` as props.
Every client renders it, including players who join later. A registered id replaces
a built-in effect of the same name, so a game can restyle `rain`.

## Rendering With CanvasEngine Preset

The scene already renders the weather state with CanvasEngine. To draw it yourself
elsewhere, feed `@canvasengine/presets` with it:

```tsx
<Canvas>
  <Weather
    effect={weatherEffect}
    speed={weatherSpeed}
    density={weatherDensity}
    sunIntensity={sunIntensity}
    rayTwinkle={rayTwinkle}
    zIndex={1000}
  />
</Canvas>
```

You can derive those values from `engine.sceneMap.weather()` / `engine.sceneMap.getWeather()`.
