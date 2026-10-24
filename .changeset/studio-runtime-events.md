---
"@rpgjs/studio": patch
---

A map editor in the page can change the events the game runs without loading the map again. The server map gets `placeStudioEvent(record, { x, y, runtimeId })` (puts an event of the project on the map as the load does: media resolved, workflows and hitbox of the project, so an enemy attacks and a character answers), `moveStudioEvent(runtimeId, x, y)`, `removeStudioEvent(runtimeId)` and `listStudioEvents()`. Positions are those the map stores; the game applies the map scale.

A map can give a size to one placement of an event: `scale` (multiplies its character and its hitbox) and `hitbox` (`{ width, height }`, instead of the hitbox of the event). The runtime applies them when it makes the event, `resolveStudioEventDisplay` takes a `scale`, and `placeStudioEvent` takes both. The graphic scale of an event no longer reads its position (`x`, `y`) as a scale.
