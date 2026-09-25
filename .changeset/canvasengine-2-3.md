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

Update CanvasEngine to 2.3.0. The 2.3 compiler no longer injects `computed`, `h`, `cond` and `loop` into every component, so components now import the helpers their script uses. `rpgjs()` declares its `Plugin[]` return type.
