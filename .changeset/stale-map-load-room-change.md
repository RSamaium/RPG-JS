---
"@rpgjs/client": patch
---

Fix a client race when the server calls `player.changeRoom()` while the client is still loading a streamed map: when that stale map load ends, it no longer replaces the gameplay room scene with the map scene or fills the map scene with the old map and its stream.
