---
"@rpgjs/studio": minor
---

The workflow runs the battle blocks `start_battle`, `start_turn_battle` and `start_tactical_battle`: they call the `studioBattle` hook of the game modules (`start`, `startTurnBased`, `startTactical`) with the troop, and the next blocks run once the battle is over. An optional `outcomeVariableId` receives how the battle ended: `1` victory, `2` defeat, `3` escape (a tactical battle left before its end counts as an escape), so a `conditional_branch` can run blocks only after a victory. A battle system tells the outcome by returning `{ outcome }` from its hook; without it, or without `outcomeVariableId`, no variable changes.
