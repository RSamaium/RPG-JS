---
"@rpgjs/script": minor
"@rpgjs/server": minor
---

Scripts open the GUIs of the client: `$player.openGui(id, data?, { blockPlayerInput? })`, `$player.updateGui(id, data)` and `$player.closeGui(id, data?)`, named after `player.gui(id).open/update` and `player.removeGui` of RPGJS. A GUI of the game (`rpg-…`) is refused. The new signal `gui.action` carries what a component sends (`gui`, `event`, `data`). It comes from a new server hook, `player.onGuiInteraction(player, { guiId, name, data })`, called for every GUI interaction.
