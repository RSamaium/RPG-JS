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

Supported effects:

- `rain`
- `snow`
- `fog`
- `cloud`

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

## Rendering With CanvasEngine Preset

Use your map weather state to feed `@canvasengine/presets`:

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
