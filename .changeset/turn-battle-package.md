---
"@rpgjs/turn-battle": patch
---

Add `@rpgjs/turn-battle`: a turn-based battle system with server-authoritative rules, battle data read from the `turnBattle` field of the RPGJS database records, and a CanvasEngine battle scene, built on `@rpgjs/battle-kit`. Server: `startTurnBattle` (solo, co-op, PvP, spectators), `stopTurnBattle`, `watchTurnBattle`, `isInTurnBattle`, `getTurnBattle`, hooks under the `turnBattle` key. Texts are `turnBattle.*` i18n keys; the keyboard controls of the game and the shared gamepad mapping drive the battle. A spritesheet of the map (`Presets.RMSpritesheet`) can be a battler as is: without an `idle` texture, it stands (`stand`, else `walk`) facing its side.
