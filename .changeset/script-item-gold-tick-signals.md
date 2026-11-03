---
"@rpgjs/script": minor
---

Add the signals `player.itemAdd`, `player.itemRemove`, `player.itemUse`, `player.itemEquip`, `player.goldChange` and `map.tick`, bound to the new module hooks of `@rpgjs/server`. `map.tick` runs once for each player of the map, without holding the map: a player whose tick listeners still run (`wait`, `showText`) skips the next ticks. New `background` option of a binding for such hooks; a failing listener is written to the console once until its script is installed again. A binding's `emit` may now return a list of emissions (type `SignalEmissions`), and a binding no script listens to is skipped.
