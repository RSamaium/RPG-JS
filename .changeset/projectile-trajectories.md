---
"@rpgjs/physic": minor
"@rpgjs/common": minor
"@rpgjs/server": minor
"@rpgjs/client": minor
---

Add generic projectile trajectories and behaviors. `trajectory.type` now accepts `arc` (a lob with a height) and `return` (out and back to the launcher), and `defineTrajectory()` registers custom paths shared by the server simulation and the client renderer. Projectiles can fly through targets (`pierce`), bounce, return or stick on walls (`wall`), collide only with walls or nothing (`collide`), and stay visible where they end (`linger`), with per-projectile `onHit`, `onWall`, `onLand` and `onEnd` hooks. Components receive `z` and `phase`.

Fixes a physics raycast that returned `NaN` points for rays parallel to a box edge.
