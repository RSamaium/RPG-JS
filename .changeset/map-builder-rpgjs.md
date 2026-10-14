---
"@rpgjs/map-builder": minor
---

Add the RPGJS integration of `@rpgjs/map-builder` (experimental, private): `@rpgjs/map-builder/server` and `@rpgjs/map-builder/client`, each with a `provideMapBuilder`.

- Server: one authority per map, connected to the players who are on it, with the same pipelines as the clients. A map can be kept between restarts (`roomStorageMapStore`, `keyValueMapStore`, or any `MapStore`).
- The static colliders of the physics, on the server and on the client, follow the elements one at a time, and are put back when RPGJS rebuilds its physics world. Map events become RPGJS dynamic events, to which the game gives behaviour.
- Client: joins the map the player is on, builds the model and the view, keeps the prediction colliders in step, plays the server's effects, and offers the view as `pixiChildren` for the event layer so it is sorted with the characters. `getMapBuilder(engine)` gives game code access.
- Game code reaches the authority with `getMapAuthority(map)`: a lever is `authority.apply(...)`.
- A player who changes map is disconnected from the previous one, even though RPGJS does not call `onLeave` then.
