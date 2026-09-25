---
"@rpgjs/common": patch
"@rpgjs/tiledmap": patch
---

Make Tiled tile collisions depend on the character `z`, as in RPGJS v4 (#370). Collision tiles are generated for every Tiled level (layer `z` + tile `z`). A tile on level `n` only blocks characters whose `z` is in `[n * zTileHeight, (n + 1) * zTileHeight)`, so `player.z.set(map.zTileHeight)` lets a player walk over level `0` collisions such as water. Static map hitboxes accept an optional `z`/`zHeight` range, and hitboxes without `z` still block every height.
