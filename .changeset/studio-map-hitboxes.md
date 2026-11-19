---
"@rpgjs/studio": minor
---

`studioMapHitboxes(map)`, exported from `@rpgjs/studio/server` and `@rpgjs/studio`, returns every collision of a Studio v2 map as the game has them (the hitboxes and polygons drawn on the map, the hitboxes of its placed elements, the collisions of its terrain relief, walls and holes), in pixels of the map. It is pure and synchronous: no data provider, no global state, no network, so a server can read the collisions of a map it already holds. `prepareStudioMapPayload` computes its `hitboxes` with it, so the two cannot drift apart.
