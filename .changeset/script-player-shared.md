---
"@rpgjs/script": patch
---

`shared()` takes a `scope`: `"room"` (the default, `$shared.<name>`, one value for the players of the room) or `"player"` (`$player.shared.<name>`, one value for each player). A property of each player is a synchronized property of the player, `script_<name>`, given to every player from its arrival: a GUI reads it with `getEntityProp(player, "script_<name>")` and updates when it changes, `client` sends it to the clients of the map and `persist` saves it with the player. Two scripts that declare the same name for each player with other options are refused, with the reason.
