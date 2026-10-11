---
"@rpgjs/studio": patch
"@rpgjs/server": patch
---

Studio events with a generated character: the hitbox saved in the map (in pixels of the source image) now follows the scale the character is displayed at, instead of staying as big as its cell.

Studio random movement waits for the frequency of the event between two moves, at map load as well as after an interaction: the `frequencyRatio: 1` override is removed, and `replayRoutes()` keeps the options (`onStuck`, `frequencyRatio`) of the infinite route it replays. The event now starts its route from its final position, after the teleport of its initialization.
