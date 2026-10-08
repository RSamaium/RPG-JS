---
"@rpgjs/studio": patch
---

Fix #379: in map streaming (`RPG_TYPE=mmorpg`), a Studio map's `backgroundMusic` and `backgroundAmbientSound` are now resolved to the assets URL (like `loadMap` does), instead of being requested on the game origin. Absolute URLs (`http(s)://`, `/`, `data:`, `blob:`) are left unchanged and media objects (`{ fileName }`) are supported.
