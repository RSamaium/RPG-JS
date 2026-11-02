---
"@rpgjs/account": patch
"@rpgjs/action-battle": patch
"@rpgjs/calendar": patch
"@rpgjs/chat": patch
"@rpgjs/client": patch
"@rpgjs/studio": patch
"@rpgjs/testing": patch
"@rpgjs/tiledmap": patch
"@rpgjs/vite": patch
"@rpgjs/vue": patch
---

Update CanvasEngine: `canvasengine` 2.5.1, `@canvasengine/compiler` and `@canvasengine/presets` 2.5.0. `@canvasengine/tiled` and `@canvasengine/testing` stay on 2.4.1, the latest published versions.

Action Battle enemy loot pops right on defeat again: CanvasEngine 2.5.1 replays the updates made during the impact freeze (hit-stop), so the loot no longer waits for its end.
