---
"@rpgjs/studio": patch
---

A Studio map extension can hide the events the game runs: `updateData({ hideEvents: true })` stops drawing them (the characters of the players are still drawn) and `false` draws them again. A map editor uses it to show the events of the map as its own markers while the map is edited.

`@rpgjs/studio/client` also gives `resolveStudioEventDisplay({ media, frame, hitbox })`: how big an event is on the map as the game runs it (the size its character is drawn at, and its hitbox once a generated character has scaled it), for a map editor that draws events at the size the player sees.
