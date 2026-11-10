---
"@rpgjs/action-battle": minor
"@rpgjs/server": minor
"@rpgjs/client": minor
---

Action Battle weapons whose `action.mode` is `projectile` now turn the basic attack into a shot released at the end of the attack startup, aimed at the soft target found within `action.range`. `action.projectile` accepts `trajectory`, `landing`, `linger`, `pierce`, `wall`, `collide` and `delay`, and an `arc` lands on the target of the action. Action Battle projectiles are stopped by walls and hit non-combat events that declare `onProjectileHit` (a switch, a bush) without damaging them.

Action Battle no longer ships its own projectile component: its projectiles are drawn by the standard projectile component of `@rpgjs/client`, so `projectile.params` takes the standard look options. Register a component for `action-battle-skill` to keep a custom look.

A ranged weapon keeps the timing of its own `attackProfile` instead of the melee combo steps, and its soft targeting also aims at scenery that declares `onProjectileHit`. `LPCSpritesheetPreset` gains a `shoot` animation for bows.

`projectiles.emit()` accepts `delay`, a wind-up in ms before the projectile leaves.

Fixes enemies driven by a behavior tree or a `simpleBehavior` staying in the alert state after spotting a target, where their attacks were neither shown nor chained. Fixes weapon actions failing after their damage because no skill states could be applied, which left the enemy AI unaware of the hit. The client now predicts the attack lock from the equipped weapon profile, which removes the position corrections after a shot.
