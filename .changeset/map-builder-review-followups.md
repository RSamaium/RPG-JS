---
"@rpgjs/map-builder": patch
"@rpgjs/studio": patch
---

Follow-ups of the review of the map builder branch.

- `keyValueMapStore` keeps its log in memory after the first read instead of reading the storage on every appended change.
- Colliders are resynced after an `element.data` patch.
- Studio: a failed import of the map builder layers is no longer cached, the cell size of a v2 map is a named constant, and the docs of the map extension context are on the right methods.
