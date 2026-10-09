---
"@rpgjs/common": patch
"@rpgjs/server": patch
"@rpgjs/client": patch
"@rpgjs/studio": patch
---

Add a day night cycle based on the `DayNightCycle` preset of CanvasEngine. Maps enable it with `lighting.dayNight`, and light spots get `halo` and `schedule` (hours they are on). With the Time Manager, `lighting: { dayNight: true }` drives the scene from the synchronized server hour; `state.hourFloat` and `state.phase` expose the hour with decimals and the phase of the day.

Time Manager fixes: the lighting phases are now merged into the lighting of the map instead of replacing it (light spots were lost), and the client projects the time from the clock of the server so a client clock that is off no longer shifts the displayed hour.
