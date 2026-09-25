---
"@rpgjs/common": patch
"@rpgjs/server": patch
---

Add `map.findSpawnPosition()` (#367): a deterministic search for the closest collision-free position of a character hitbox near a preferred point. It honors map bounds, map hitboxes and their `z` range, static shapes and blocking events, requires room to move by default, and returns `null` instead of placing a character inside a collider.
