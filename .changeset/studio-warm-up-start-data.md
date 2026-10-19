---
"@rpgjs/studio": patch
---

Ask for the project, the database, the start map and the tilesets of that map when the Studio client module is created, long before the engine starts, instead of one round trip after the other once it has.
