# @rpgjs/physic

## 5.1.0

### Minor Changes

- 5e1b68c: Add generic projectile trajectories and behaviors. `trajectory.type` now accepts `arc` (a lob with a height) and `return` (out and back to the launcher), and `defineTrajectory()` registers custom paths shared by the server simulation and the client renderer. Projectiles can fly through targets (`pierce`), bounce, return or stick on walls (`wall`), collide only with walls or nothing (`collide`), and stay visible where they end (`linger`), with per-projectile `onHit`, `onWall`, `onLand` and `onEnd` hooks. Components receive `z` and `phase`. Any event can react to a hit with `onProjectileHit` and reply `stop`, `pass` or `stick`; players and modules get the same hook. Projectiles fly over loot pickups.

  Fixes a physics raycast that returned `NaN` points for rays parallel to a box edge.

## 5.0.4

### Patch Changes

- aa0fa28: Order the collisions of a step much faster, with the same order. The world sorted its collisions on every resolver pass by building the pair key again for each comparison and comparing with `localeCompare`; with about 30 players overlapping on a map it was more than 40 % of the CPU time of a server. The key is now built once per sort, and the ids made of ASCII letters, digits and `-` (those of RPGJS) are compared with plain string comparisons that give the order of the root collation (letters without their case, then lowercase before uppercase). Any other key goes through a shared `Intl.Collator`, and the plain comparison is only used after a check, once, that it matches the collation of the runtime. The order of the collisions, and so the simulation, is unchanged.

## 5.0.3

### Patch Changes

- ccb9495: Fix TypeScript declaration errors across the package build, align multi-target declaration exports, complete movement API overloads, and make package and root builds fail when declaration generation reports a type error.

## 5.0.2

### Patch Changes

- ccb9495: Fix TypeScript declaration errors across the package build, align multi-target declaration exports, complete movement API overloads, and make package and root builds fail when declaration generation reports a type error.

## 5.0.1-beta.0

### Patch Changes

- Release the next RPGJS beta with client interactions, i18n support, movement and physics improvements, Studio fixes, action battle updates, playground migration, and related runtime documentation.

## 5.0.0

### Minor Changes

- 18aa0ad: Add movement strategy helpers, physics gameplay examples, and expanded physics documentation.
