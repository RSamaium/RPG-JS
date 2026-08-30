---
"@rpgjs/tiledmap": patch
---

Preserve Tiled tile and layer `z` metadata and their tile ID positions in MMORPG map streams so foreground tiles render above characters without assigning depth to the wrong tiles, while other private custom properties remain server-side.
