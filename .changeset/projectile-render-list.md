---
"@rpgjs/client": patch
---

Stop rebuilding projectile components on every frame. `ProjectileManager.renderList` only changes when projectiles appear or disappear, and pushes positions and progress into per-projectile signals on each step; the map scene renders from it. `current` keeps its plain-value contract. In the sample, JavaScript work per frame with projectiles drops from about 7.5 ms to 5.2 ms.
