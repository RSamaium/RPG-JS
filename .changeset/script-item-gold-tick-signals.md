---
"@rpgjs/script": minor
---

Add the signals `player.itemAdd`, `player.itemRemove`, `player.itemUse`, `player.itemEquip`, `player.goldChange` and `map.tick`, bound to the new module hooks of `@rpgjs/server`. `map.tick` runs once for each player of the map. A binding's `emit` may now return a list of emissions (type `SignalEmissions`), and a binding no script listens to is skipped.
