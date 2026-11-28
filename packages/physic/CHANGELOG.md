# @rpgjs/physic

## 5.1.2

### Patch Changes

- 2cd754e: On a streamed map, the server simulates events according to the interest of players (#517). An event in a chunk that no player retains is paused: its route, its movements and its physics stop, it keeps its state and its hitbox, and it goes on when a player comes near. With 100 wandering events of which 8 are near the player, a step takes about 1.4 ms instead of 10.5 ms.

  **Behavior change:** an event far from every player no longer moves. Set `event.alwaysSimulated = true` for an event that must keep moving everywhere, or `eventSimulation: 'always'` in the options of `provideServerMapStreaming()` (the `streaming` options of `provideTiledMap()` and of the Studio module) to simulate every event as before.

  `MovementManager` has `pause()`, `resume()` and `isPaused()`: the strategies of a paused entity keep their state and are not updated. In a world step, a sleeping entity that did not change is no longer synchronized with the spatial partition and does not start a collision query; its collisions are kept until an entity reaches it, or until it moves or is removed.

- 3d39a17: A moving event costs less on the server (#516). During a world step, the position handlers of an entity (`entity.onPositionChange`) are called once, after the collision resolution and with the final position, instead of once per move of the integrator and of the resolver. Outside a step (`teleport()`, `notifyPositionChange()`), they are still called immediately. `World.getEntityByUUID()` reads an index instead of scanning every entity. The interpolation frames of a character (`_frames`) are no longer written to the room storage; they are still sent to clients.

## 5.1.1

### Patch Changes

- 561e68c: The published type declarations resolve under `moduleResolution: "node16"` and `"nodenext"`. Their relative imports now name the file (`./core/math/Vector2.js` instead of `./core/math/Vector2`), as TypeScript requires for the declarations of a `"type": "module"` package. Before, a project compiled with `tsc` in that mode (a standalone Node server, for example) lost the names re-exported with `export *` (such as `clamp` from `@rpgjs/physic` or `RpgPlayer` from `@rpgjs/server`) and got `any` for the others. Projects that resolve with `"bundler"` (Vite) see no change. `rpgjsModuleViteConfig` from `@rpgjs/vite` applies the same fix to the modules it builds.

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
