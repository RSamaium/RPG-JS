---
"@rpgjs/common": patch
"@rpgjs/server": patch
"@rpgjs/client": patch
"@rpgjs/action-battle": patch
---

With Action Battle, the action key talks to an NPC (or uses a chest) instead of attacking. Events with an `onAction` hook are now synchronized as `interactive` (enemies with a `BattleAi` are not), `map.getInteractableObjectIds()` lists what is in front of a character, and the `onInput` hooks receive the action with `interactedWithEvent` when an interactive event handled it. The client no longer plays its predicted attack when it faces an interactive event.
