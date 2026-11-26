---
"@rpgjs/script": patch
---

`$player.showAttachedGui(targets?)` and `$player.hideAttachedGui(targets?)` take the id of a player, or a list of ids, to show or hide the GUIs attached to the sprites of other players of the map (#525). They only acted on the sprite of the player of the script.
