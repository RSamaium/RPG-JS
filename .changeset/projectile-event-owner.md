---
"@rpgjs/server": patch
---

Projectiles: the hooks of a projectile launched by an event (`onHit`, `onEnd`, `onLand`, `canHit`, `onProjectileHit`, `projectiles.onImpact`) receive that event as `owner`, typed `ProjectileOwner`.
