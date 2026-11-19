---
"@rpgjs/action-battle": minor
---

`player.useSkill(id)` without a target (server code, scripts) aims at the nearest enemy within the reach of the action (`action.range`, otherwise the skill targeting range), whatever the player faces, and turns the player toward it. With none in reach, the skill is used straight ahead. A skill key pressed by the player keeps the soft targeting in front of the player.
