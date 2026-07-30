---
"@rpgjs/server": patch
"@rpgjs/client": patch
"@rpgjs/action-battle": patch
"@rpgjs/studio": patch
---

Allow hotbars to filter entry types dynamically, let Action Battle resolve
visibility per player, apply RPGJS Studio project hotbar settings, expose a
Studio event block for displaying or hiding the Hotbar, and honor the Studio
Title Screen, HUD, and Main Menu bindings. The main menu now hides disallowed
item or skill assignment actions, displays the item slot picker correctly, and
clears the native assignment when the last consumable is used.
