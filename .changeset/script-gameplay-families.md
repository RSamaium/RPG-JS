---
"@rpgjs/script": minor
---

Scripts get five families of gameplay, each with the guards of the sandbox (checked arguments, plain data, limits per map):

- **Positions and sight**: `$player.x`, `$player.y`, `$player.direction`, `$event.direction`, the `direction` of `$map.getEvent(s)`, and the functions `distance(a, b)` and `inSight(from, to, { range, angle, walls })` (a cone around where `from` faces; `walls` uses the physics of the map).
- **Zones attached to an event**: `$map.attachShape(eventId, { radius | width/height, angle, direction, limitedByWalls, positioning, follow: "position" | "direction", properties })`. Players entering and leaving it fire `player.inShape` / `player.outShape`, whose `shape` now has `eventId`. `removeShape` removes it.
- **Movement**: `$map.moveEvent(id, { x, y } | "player", { speed, wait })` (the new signal `event.arrived` fires when it arrives), `followPlayer`, `fleePlayer`, `stopEvent`, `turnEvent`, `teleportEvent`, `setEventVisible`, and `$player.teleport({ x, y })`. 50 events of a map at most follow or flee at once.
- **Scenery**: `$map.getTile(x, y)` (cell, collision, properties) and the signal `player.touchTile` for the tiles whose properties have `interactive: true`.
- **Battle and stats**: `$player.hp` and `$player.sp` (writable, kept between 0 and their maximum), `$player.maxHp`, `$player.maxSp`, and `$player.startBattle(troopId, { kind })`, which plays the troop through the `studioBattle` hooks of the battle modules and gives `"victory"`, `"defeat"`, `"escape"` or `null`.

- **How events look**: `$map.setEventGraphic(id, graphic)`, `$map.playEventAnimation(id, name, times)`, `$map.showEmotionBubble(id, emotion)` and `$player.showEmotionBubble(emotion)`.
- **States**: `$player.addState`, `removeState`, `hasState`, `getStates`.
- **Experience, skills, equipment and items**: `$player.exp` (`=` and `+=`), `learnSkill`, `forgetSkill`, `hasSkill`, `getSkills`, `equip(id, equipped?)`, `isEquipped`, `useItem`.
- **Enemies**: `$map.spawnEnemy({ enemy, x, y, id?, name? })` makes an event and asks the game to turn it into an enemy through the `scriptEnemy.create(event, enemyId)` hooks of its modules (with Action Battle, `createActionEnemy`); an enemy the game does not have is refused.

- **Time**: the filter option `every` (`on("map.tick", { every: 0.5 }, ...)`) runs a listener at most once every so many seconds for each player, skipped before the script starts; `$player.startTimer(name, seconds, { repeat })` and `stopTimer(name)` emit the new signal `timer.fire` for the player.
- **Cutscenes**: `$player.canMove` (writable) and `$player.cameraFollow(eventId | "player", { smoothMove, time })`.
- **For one player**: `forPlayer: true` on `$map.createDynamicEvent` and `$map.spawnEnemy` makes a scenario event of that player only.
- **Defeated enemies**: `actionBattleHooks` emits the new signal `enemy.defeated` (`event`, `enemy`) when a player defeats an event.
- **Persistent `$state`**: `ScriptService({ stateStore: { load, save } })` reads the state of a script when it is installed and saves it after each turn of changes; `flushState()` saves what is left.
- **Debugging**: `log(...values)` writes to the console (or `onLog`) and `ScriptService.logs`; `checkScript` gives `warnings` (map.tick without every, waiting in map.tick, making in a loop, a follow nothing stops, moves never given back); `describeGameApi` starts with the API by family, with an example each.

- **The public API of the engine**: a name of the description can mirror a method or a property of the engine (`engine: "player.flash"`): its arguments are checked against its signature (a type checker of the TypeScript of the signatures, `checkValue` / `checkArguments`), then given to the engine, and what it gives back is copied as plain data; the simulation records it without code of its own. Most of the public API of `RpgPlayer` and `RpgMap` is given this way: physics (`through`, `speed`, `setHitbox`, `setMass`…), look (`flash`, `tint`, `setComponentsTop`…, components as data), parameters (`addParameter`, `getParamValue`, `applyDamage`…), moves (`dash`, `knockback`, `moveRoutes` with routes as data…), sounds, loot, shop, hotbar, GUIs of the game, `queryArea`, `findSpawnPosition`, `suspendEvents`, `addInDatabase`… An event has the same through `$map.eventCall`, `eventGet` and `eventSet`. What `ENGINE_COVERAGE` leaves out is only what is not gameplay, private, or not data.

`simulate` and `runTests` run all of them in memory (`world: { player: { x, y, hp }, sheet: { exp, states, skills, equipment, equipped, usable }, events, tiles, walls, battles, enemies }`, and expectations such as `"events.guard.x"`). `ENGINE_COVERAGE` (`@rpgjs/script/testing`) gives, for every public method of `RpgPlayer`, `RpgEvent`, `RpgMap`, `Gui`, the projectiles of the server and every export of `@rpgjs/action-battle`, the name scripts use or the reason they do not have it; a test fails when a method of the engine has no decision.
