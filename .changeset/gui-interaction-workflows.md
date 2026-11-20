---
"@rpgjs/studio": minor
---

The game runs the workflows of GUI interactions. When a GUI sends an interaction, the server runs the block collection of that GUI the interaction names (its id), for that player, with the execution profile `guiInteraction` (`guiInteractionMap` on a map; source `gui_interaction`, capability `guiInteraction`) and `context.guiInteraction` (`blockCollectionId`, the `data` the GUI sent, the `gui`). Only a collection attached to that GUI in the published `guis` of the project runs. New block `use_hotbar_slot`: it uses the hotbar slot whose index (0 to 9) the GUI sent, and never a skill or item id from the client; a missing or out of range index stops the workflow. The workflows of event pages and of map loads are unchanged.
