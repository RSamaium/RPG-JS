---
"@rpgjs/server": patch
---

Players of connections that were open when a Node.js server stopped (a deploy, a crash, a restart) are no longer restored for ever. Their session stayed marked as connected in the room storage, so it never got a `disconnectedAt` and the garbage collector of sessions never expired it: each restart added more players to the map, each with a physics body that was sent to every client, and the tick of the map slowed down. When a room starts from its storage, the Node transport now marks those sessions as disconnected as of now, so that they follow the usual rule: the player can reconnect within the reconnect window and is the same player, and after it the session and the player are removed, even if nobody connects in the meantime. A player that has no session at all is discarded when the room is restored, before it takes part in the physics or in the first synchronization.
