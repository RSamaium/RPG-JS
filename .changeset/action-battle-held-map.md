---
"@rpgjs/action-battle": patch
---

The enemies of `@rpgjs/action-battle` also stand still, and stop walking, while their map has `battleAiHeld` set to `true`. Unlike `setAutoTick(false)` this does not pause the map: it goes on running (the players move, the clock goes on) and only the AI of the enemies is held. A map editor sets it while it works on a map.
