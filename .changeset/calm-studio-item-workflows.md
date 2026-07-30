---
"@rpgjs/studio": patch
"@rpgjs/server": patch
"@rpgjs/client": patch
---

Add type-aware Studio item fields and lifecycle workflows. Regular items expose
consumable use hooks, while weapons and armors expose equipment modifiers and
the native equip hook. Regular items can also display a configured spritesheet
animation, play a personal sound, and display a built-in particle effect after
successful use. The editor groups Item fields into dedicated layouts. Because
the Item schema is conditional, it resolves the selected Item, Weapon, or Armor
branch before distributing fields across editor tabs, avoiding duplicate
generic property sections. Online Studio games refresh database records when a
player joins a map, and item use resolves lifecycle hooks from the current map
database so a removed use animation no longer survives in an inventory
snapshot.

Clarify the built-in hotbar model: it accepts learned skills and usable regular
items, while weapons and armors remain browseable in Items and are managed from
Equip. Studio now labels these choices as usable items, filters starting
equipment selectors by slot type, and ignores invalid saved equipment without
adding it to the player's inventory.

The Studio Item editor now derives its tabs from the selected item type.
Regular items expose Usage and Presentation, while weapons and armors expose
Equipment, so conditional schemas no longer leave empty tabs visible.
Custom fields now leave their schema description to the shared CMS field
wrapper, preventing duplicate help text, and Item and Skill lifecycle actions
are consistently presented as triggers in the editor.

Creating a trigger now persists its parent Item or Skill first, keeps the
editor on the newly created record, and immediately saves the trigger
attachment. Failed attachments restore the previous form state instead of
leaving an untracked trigger.

The Studio Skill editor now presents its schema layouts as translated tabs,
matching the Item editor while keeping Action Battle and its triggers together.
Area size, presets, and individual area-mask edits now notify the Skill form,
so the updated targeting area is saved and restored after reloading the editor.
Translated Skill and Item media fields now render the same native media preview
as icon fields, including image, spritesheet, and audio previews.
