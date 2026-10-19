---
"@rpgjs/studio": patch
---

Start the terrain workers when Studio starts, so they are booted by the time the first map needs them. An unused warmed worker is stopped after a minute.
