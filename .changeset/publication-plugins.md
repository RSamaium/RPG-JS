---
"@rpgjs/server": minor
---

A versioned publication can carry the plugins of the project: `prepareRpgPublication(bucket, { shared: { config, database, plugins } })`. A room receives them with its map, in the `plugins` field of the map payload (accepted by the map update schema), so a module can read them in `map.onBeforeUpdate` and the scripts of a version change together with its maps, in every room that applies it, without restarting the server. A change of the plugins alone changes the shared part of the version, so the rooms apply it. A map still cannot store `plugins` itself, and a version without plugins keeps its previous hash.
