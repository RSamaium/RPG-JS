---
"@rpgjs/script": minor
---

Scripts listen to the battles and to the modules: `battle.start`, `battle.command`, `battle.end`, `combat.hit` (`actionBattleHooks`), `player.skillChange`, `player.connect` and `player.disconnect`. A module binds its own hook scope, and `checkScript`, `simulate`, `runTests` and `describeGameApi` take the `signals` of the modules.
