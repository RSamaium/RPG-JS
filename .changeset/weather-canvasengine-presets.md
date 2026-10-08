---
"@rpgjs/common": minor
"@rpgjs/client": minor
"@rpgjs/server": minor
---

Weather supports every CanvasEngine effect and preset, and custom weather components.

- `WeatherState.preset` is forwarded to CanvasEngine's `<Weather>`, `effect` is optional when a preset gives it, and every param is forwarded as it is. `map.setWeather()` and `patchWeather()` accept a preset without an effect, and a patch with a new preset or effect replaces the previous one.
- `WeatherEffect` accepts the CanvasEngine effects (`rays`, `embers`, `ash`, `leaves`, `petals`, `fireflies`, `spores`, `sand`) and custom ids; `WeatherParams` is open. `@rpgjs/common` exports the catalog (`WEATHER_EFFECTS`, `WEATHER_PRESET_EFFECTS`, `WEATHER_PRESET_NAMES`, `getWeatherPresetEffect()`, `resolveWeatherEffect()`) without importing the renderer.
- New `weathers: [{ id, component }]` client module option: when `effect` is a registered id, the scene renders that component in the weather layer, and a registered id replaces a built-in effect of the same name. An unknown effect or preset is reported once and renders nothing.
