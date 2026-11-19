---
"@rpgjs/server": minor
"@rpgjs/action-battle": minor
"@rpgjs/script": minor
---

`registerSkillUseHandler(handler)` lets a battle system run `player.useSkill`. Action Battle uses it: on a map where it is enabled, `player.useSkill(id, target?)` runs a skill that has an `action` with the battle rules (projectile, damage formula, factions, states, SP cost, cooldown, soft targeting without a target). Hotbar skills, server code and scripts now hit the same way.

Scripts: `$player.useSkill(skillId, { target? })` uses a skill (target: id of an event or a player of the map) and gives `false` when it cannot be used now. The `damage` of `$map.launchProjectile` is now really removed from what the projectile hits (it was only stored in the payload); it is fixed damage, without the battle rules. The script docs no longer say `projectile` can be a Studio projectile record: it is the type the clients draw.
