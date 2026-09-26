---
"@rpgjs/client": patch
"@rpgjs/server": patch
"@rpgjs/vite": patch
"@rpgjs/studio": patch
"@rpgjs/tiledmap": patch
"@rpgjs/action-battle": patch
"@rpgjs/testing": patch
"@rpgjs/vue": patch
"@rpgjs/chat": patch
"@rpgjs/account": patch
---

Update CanvasEngine to 2.4.0. Templates now read computed signals explicitly (`position().x` in the HP bar, light halo and dynamic bar components) and the action-battle projectile trail passes `loop={true}` to its `Fx`.
