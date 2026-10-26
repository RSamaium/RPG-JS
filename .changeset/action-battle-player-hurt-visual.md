---
"@rpgjs/action-battle": patch
---

A player hit by a basic attack of another player (PVP, through `combat.targets.canTarget`) now gets the same hurt feedback as an enemy: flash, floating damage number and hurt animation. `applyActionBattleEntityHit()` only emitted a visual for a block or a parry, and relied on `battleAi.handleDamage()` for the `hurt` visual, which a player does not have. A target without AI now gets the `hurt` visual as in the skill path; a blocked or parried hit still gives only the block or parry visual.
