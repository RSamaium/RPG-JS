---
"@rpgjs/studio": patch
---

With `mapBuilderRenderer`, the elements drawn by the map builder in the ground and high layers are now one container per element carrying its sort key, so they are sorted by depth together with the elements the Studio renderer keeps, instead of all being drawn above them.
