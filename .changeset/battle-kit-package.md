---
"@rpgjs/battle-kit": patch
---

Add `@rpgjs/battle-kit`, the foundation shared by the RPGJS battle systems. `@rpgjs/battle-kit/server`: the registry of the running battles (`BattleSessions`: busy players, spectators, disconnections), the checks of who takes part (`battleParticipants`), the hooks of the game modules (`BattleServerHooks`), database records and the reading and writing of a player (`readBattlePlayer`, `writeBattlePlayer`). `@rpgjs/battle-kit`: the GUIs of the game hidden during a battle (`hideGuisDuringBattle`, options `hideGuis`, `keepGuis`, `onBattleShown`), the controls of a battle GUI with the keyboard controls of the game and the gamepad mapping of the RPGJS GUIs (`battleControls`), sound cues (`BattleCues`), client hooks, effect presets (`FxPlayer`, aimed by CanvasEngine) and screen impacts. `@rpgjs/battle-kit/pure`: a presentation clock and the playback of Visual Effects, with the vocabulary of `map.playVisualEffect`.
