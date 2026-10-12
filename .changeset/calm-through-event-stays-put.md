---
"@rpgjs/common": patch
"@rpgjs/server": patch
"@rpgjs/studio": patch
---

An event set to `through` and placed on a collision (a seller behind a counter) stays where it was placed and no longer jumps. The collision filter only let `through` events cross other characters: walls and map hitboxes still pushed the event out (5 px at a time) before its position was put back, at every physics step. A `through` event now ignores them too (players are unchanged), and the Studio init applies `through` before it teleports the event to its position.
