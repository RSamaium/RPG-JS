---
"@rpgjs/studio": minor
---

The Visual Effects and the Projectiles of the Studio database play with the published package (#499):

- the blocks `play_visual_effect` and `launch_projectile` are in `defaultExecutors`;
- a skill with a Visual Effect plays it from the caster to the target, and its damage lands at the `hitAt` of the effect (`createStudioActionBattlePreset` gives `skills.playEffect`);
- a skill or an item thrown in combat (`throwProjectile`) flies with its Projectile record: its path, its area and its look (the client registers one look per Projectile record);
- an item with a use Visual Effect plays it on the player;
- an event page "Hit by a projectile" (`onProjectileHit`) runs when a projectile hits the event, and says whether it stops, passes through or sticks.
