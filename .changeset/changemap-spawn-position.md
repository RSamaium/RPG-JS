---
"@rpgjs/client": patch
---

`player.changeMap(map, { x, y })` while the player is moving no longer leaves the sprite and the camera on the coordinates of the source map. The first position received from the destination map is now applied immediately instead of waiting behind the pending movement inputs.
