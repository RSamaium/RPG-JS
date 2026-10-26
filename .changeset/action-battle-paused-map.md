---
"@rpgjs/server": patch
"@rpgjs/action-battle": patch
---

The enemies of `@rpgjs/action-battle` stand still while their map is paused with `map.setAutoTick(false)`: their AI has its own timer, so it went on fighting. `RpgMap.isAutoTickEnabled()` tells whether the map runs its loop.
