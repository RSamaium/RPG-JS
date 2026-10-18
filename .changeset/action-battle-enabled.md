---
"@rpgjs/action-battle": minor
---

Add an `enabled` option to `provideActionBattle()` (a boolean or a function of the player, event and map) to keep the module installed but inactive: no attack, dodge, guard or hotbar on the input, no AI for the events. The local attack animation of the client still follows the input.
