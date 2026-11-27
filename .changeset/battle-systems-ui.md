---
"@rpgjs/client": patch
"@rpgjs/ui-css": patch
---

`menuGamepadControls` is exported by `@rpgjs/client`, so the GUIs of modules answer the gamepad like the built-in ones (A confirms, B or Start goes back, the d-pad or the stick moves, L/R switch tabs). `@rpgjs/ui-css` styles the HUDs of the turn-based battle (`rpg-ui-turn-battle-*`) and of the tactical battle (`rpg-ui-tactical-*`), with their stories.
