---
"@rpgjs/physic": minor
"@rpgjs/common": minor
"@rpgjs/server": minor
"@rpgjs/client": minor
---

Add generic projectile trajectories and behaviors. `trajectory.type` now accepts `arc` (a lob with a height) and `return` (out and back to the launcher), and `defineTrajectory()` registers custom paths shared by the server simulation and the client renderer. Projectiles can fly through targets (`pierce`), bounce, return or stick on walls (`wall`), collide only with walls or nothing (`collide`), and stay visible where they end (`linger`), with per-projectile `onHit`, `onWall`, `onLand` and `onEnd` hooks. Components receive `z` and `phase`. Any event can react to a hit with `onProjectileHit` and reply `stop`, `pass` or `stick`; players and modules get the same hook. Projectiles fly over loot pickups.

Fixes a physics raycast that returned `NaN` points for rays parallel to a box edge.

Projectiles can aim at a point or an entity with `target`; an `arc` lands on it and, with `landing: { radius }`, hits what stands there. Types without a registered component are drawn by a standard projectile component whose look (shape or spritesheet, shadow, trail, impact by surface, sound, shake) is declared per type on the client with `projectiles.looks`, so the server only sends the type; `params` can still override single fields of one shot. Impacts carry a `surface` (`target`, `wall` or `ground`), components receive `flightAngle`, and `params.impactDuration` sets how long an impact stays drawn.
