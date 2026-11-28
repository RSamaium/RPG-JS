# @rpgjs/tactical-rpg

## 5.2.1

### Patch Changes

- 8157893: Add `@rpgjs/tactical-rpg`: grid-based tactical battles (rules, AI, objectives, skills with areas, HUD and battlefield, server and client hooks), independent of the turn-based battle and built on `@rpgjs/battle-kit`. Server: `startTacticalBattle` (solo, co-op, PvP, spectators), `stopTacticalBattle`, `watchTacticalBattle`, `isInTacticalBattle`, `getTacticalBattle`, hooks under the `tactical` key. Data in the `tactical` field of the database records, with the native `spCost`, `power`, `hpValue` and `spValue`. A `hero: true` placement is the hero of a player, read from the `RpgPlayer` (HP, SP, parameters, skills, items) and written back at the end. Texts are `tactical.*` i18n keys; the keyboard controls of the game and the shared gamepad mapping drive the HUD. The battle is drawn at the scale of the map: the cells are its tiles, the characters keep their map size, the camera keeps the map's zoom, and `engine.hideMapObjects` hides the events and players of the map on the fighters' screens.
