---
"@rpgjs/server": patch
---

A map room created again from its storage (an evicted Durable Object, a restarted process) rebuilds its map when a player joins, and runs its loop again: it stayed frozen, with events that did not move and no sync, when the client did not ask for the map stream or when a player had already left the new instance (#519)
