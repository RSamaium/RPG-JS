---
"@rpgjs/server": patch
---

A map room woken after a restart now rebuilds its map, and so its database, before it restores a player transferred to it. A player owning a skill or an item of the map's database can enter the map again instead of staying on the lobby. A map that is already loaded is not rebuilt when another player arrives.
