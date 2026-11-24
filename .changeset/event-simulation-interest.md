---
"@rpgjs/server": patch
"@rpgjs/physic": patch
"@rpgjs/common": patch
"@rpgjs/tiledmap": patch
"@rpgjs/studio": patch
---

On a streamed map, the server simulates events according to the interest of players (#517). An event in a chunk that no player retains is paused: its route, its movements and its physics stop, it keeps its state and its hitbox, and it goes on when a player comes near. With 100 wandering events of which 8 are near the player, a step takes about 1.4 ms instead of 10.5 ms.

**Behavior change:** an event far from every player no longer moves. Set `event.alwaysSimulated = true` for an event that must keep moving everywhere, or `eventSimulation: 'always'` in the options of `provideServerMapStreaming()` (the `streaming` options of `provideTiledMap()` and of the Studio module) to simulate every event as before.

`MovementManager` has `pause()`, `resume()` and `isPaused()`: the strategies of a paused entity keep their state and are not updated. In a world step, a sleeping entity that did not change is no longer synchronized with the spatial partition and does not start a collision query; its collisions are kept until an entity reaches it, or until it moves or is removed.
