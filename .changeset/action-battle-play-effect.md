---
"@rpgjs/action-battle": minor
---

`skills.playEffect` plays the effect of a skill or a combat item when it is cast. It returns what it played: `hitDelayMs` delays the hit of an instant or melee action until the effect reaches the target, `projectile` gives the projectile its path and its look, `area` replaces the area of the action. When it played something, the `castFx` / `impactFx` particles are turned off.
