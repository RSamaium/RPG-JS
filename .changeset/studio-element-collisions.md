---
"@rpgjs/common": patch
"@rpgjs/server": patch
"@rpgjs/client": patch
"@rpgjs/studio": patch
---

The collisions of a Studio map can follow its placed elements while it runs. `@rpgjs/common` gets `map.replaceStaticHitboxes(match, hitboxes)`, which replaces the static hitboxes whose id matches, whether they came with the map data or from a streamed chunk. `@rpgjs/studio` gets `rebuildElementCollisions({ low })` in the context of a map extension, which rebuilds the hitboxes of the placed elements on the client map and tells the server, and `createStudioElementCollisionsServer({ authorize })` (from `@rpgjs/studio/server`), the server module that applies it for the players it allows, on a standalone or an online (MMORPG) server.
