---
"@rpgjs/server": patch
"@rpgjs/studio": patch
---

Fix `player.changeRoom()` into a custom gameplay room (`RpgGameplayRoom`) in MMORPG mode for a player who has items, equipment, skills, states or a class: the room now loads the module `database` before it restores the player, instead of failing with `The ID=... data is not found in the database`. A `database` function receives the gameplay room as well as maps; the Studio database loader reads the project database from its data provider there.
