---
"@rpgjs/server": patch
---

`player.useItem()` now applies `hpValue` and `mpValue` of the item: `hpValue` is added to `hp` and `mpValue` to `sp`, limited to the maximum (and `sp` never goes under `0`). The effect runs before `onUse` and is skipped when the `hitRate` roll fails. A class-based item that already adds `hpValue` in `onUse` must drop that line, or it heals twice. Adds `player.applyEffect(item)`.
