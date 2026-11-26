---
"@rpgjs/server": patch
---

Hooks fired without being awaited (`onAction`, `onInput`, `onInShape`/`onOutShape`, `onDetectInShape`/`onDetectOutShape`, `onTouch`, `onPlayerTouch`, item, skill, class, gold, hotbar and parameter hooks) no longer stop the server when they throw or reject. The error is logged with the hook name and the player or event id, and the map keeps running. The new `player.runHook()` / `event.runHook()` runs a hook this way.
