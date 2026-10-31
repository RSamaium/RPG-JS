---
"@rpgjs/common": minor
"@rpgjs/server": minor
"@rpgjs/client": minor
"@rpgjs/action-battle": minor
---

Add world loot. `event.dropLoot()` and `map.dropLoot()` pop gold (split into coins) and items as pickups that arc out, bounce, and are collected by magnet, by touch or with the action key. Options cover owned loot (scenario events), magnet radius per player, lifetime, `canCollect` and `onCollect`. Items can declare a `loot` config (`visual`, `color`, `sound`, `rarity`, `use`), and the `loot` client hook registers custom pickup components, default sounds and a collect text.

Action Battle enemies pop their rewards as loot with `rewards.drop`, after the impact freeze. `defineActionBattleEnemy()` now accepts `graphic` and declarative `stats`, applied by `createActionEnemy()`.
