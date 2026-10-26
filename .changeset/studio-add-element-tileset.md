---
"@rpgjs/studio": patch
---

A Studio map extension can teach the map an element set it was not loaded with: `context.addElementTileset(tileset)` makes the elements of a set that was added while editing resolvable, drawn and solid like those of the sets the map came with, without loading the map again.
