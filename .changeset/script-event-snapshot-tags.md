---
"@rpgjs/script": patch
---

`$map.getEvents()` and `$map.getEvent(id)` now give the `tags` of the events, as the signals already do. A script that looks at the map on its own (`map.tick`, `player.joinMap`) finds the events of a kind with `$map.getEvents().filter((e) => e.tags.includes("sheriff"))` instead of their name. `simulate()` keeps the `tags` of `world.events`.
