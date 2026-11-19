---
"@rpgjs/server": minor
"@rpgjs/script": minor
---

The `onDestroy` hook of the projectiles receives `x`, `y` (where the projectile ended: the impact, where it landed, or the end of its range) and `surface` (`target`, `wall` or `ground`).

Scripts: `projectile.end` gives that point instead of the origin of the projectile, which it gave for a bomb that landed or a shot that reached its range, and adds `surface`. `$map.launchProjectile` takes `arc` (lob it onto `toward`), `landingRadius` (hit what stands where it lands) and `delay` (a wind-up in ms).
