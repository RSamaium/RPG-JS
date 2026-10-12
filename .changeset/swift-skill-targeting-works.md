---
"@rpgjs/action-battle": patch
---

Fix hotbar skills that could not be used (Studio). The targeting cursor took the size of the hitbox of the player as the size of a tile, so the tile sent to the server did not match the server one and the skill was rejected as out of range; it now uses the configured tile size, else the one of the map. The targeting overlay and the attack preview never showed, because they read the id of the sprite from a signal instead of its value.

A skill whose area mask hits a single cell (Studio writes it as a 3x3 grid, `["...", ".#.", "..."]`) is no longer treated as an area skill: a melee skill without range is used at once on the enemy in front of the player, with no manual targeting cursor.
