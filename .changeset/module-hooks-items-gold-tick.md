---
"@rpgjs/server": minor
---

New module hooks, called in addition to the hooks of the items and without changing their behavior: `player.onItemAdd`, `onItemRemove`, `onItemUse`, `onItemEquip` (`player`, `{ itemId, quantity }`, plus `equipped` for `onItemEquip`) and `player.onGoldChange` (`player`, `{ gold, delta }`, also called by `buyItem()` and `sellItem()`), and `map.onTick` (`map`, `{ deltaMs, tick }`), called after each server tick of a map that has players.
