---
"@rpgjs/server": patch
"@rpgjs/action-battle": patch
"@rpgjs/client": patch
---

`player.useSkill` refuses a silenced player (`CAN_NOT_SKILL`) before any skill use handler runs, and a skill given as a class or an object reaches the handlers by its id. With Action Battle, a target given to `useSkill` must be allowed by the action and within its reach, and the player turns toward the target only once the skill is used. A ranged weapon releases no projectile when the player is defeated, changes map or cancels the attack during the startup. The client weapon profile is kept per connection. Projectile targets are synchronized after a hit only when a hook ran.
