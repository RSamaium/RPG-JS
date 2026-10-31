---
"@rpgjs/action-battle": minor
---

Add world loot to Action Battle. With `rewards.drop`, a defeated enemy pops its gold (split into coins) and its items as pickups that arc out, bounce, and fly to the first player in range. `dropActionBattleLoot()` spawns the same loot from chests or scripts, with `ownership: "attacker"` for loot only the owner sees. `defineActionBattleEnemy()` now accepts `graphic` and declarative `stats`, applied by `createActionEnemy()`.
