---
"@rpgjs/studio": patch
---

Build hole and water collision borders from the final painted surface instead of every brush segment. Apply paint and erase operations in order, remove internal overlapping edges, simplify the resulting contours, and clip bridge openings precisely. This reduces collision bodies and loading work while keeping erased paths and islands walkable in standalone games and authoritative multiplayer maps.
