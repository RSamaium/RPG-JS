---
"@rpgjs/server": patch
---

Fix `onInShape` / `onOutShape` never firing for static shapes created with `map.createShape()`: shapes have no owner and no `z`, so the height filter for touch collisions discarded them before the shape hooks ran.
