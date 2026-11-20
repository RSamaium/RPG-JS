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

`simulate` and `runTests` run all of them in memory (`world: { player: { x, y, hp }, sheet: { exp, states, skills, equipment, equipped, usable }, events, tiles, walls, battles, enemies }`, and expectations such as `"events.guard.x"`). `ENGINE_COVERAGE` (`@rpgjs/script/testing`) gives, for every public method of `RpgPlayer`, `RpgEvent` and `RpgMap`, the name scripts use or the reason they do not have it; a test fails when a method of the engine has no decision.
