---
"@rpgjs/studio": patch
---

Studio elements with a sloped polygon hitbox, such as a mountain, are now drawn in 8 px columns that each sort on the bottom edge of the hitbox at their own x, so a character standing in front of the slope is no longer hidden behind it. A concave hitbox, whose columns cross several ridges, is also cut into one slice per ridge, each sorted on its own base. Flat hitboxes (trees, walls) keep a single sort key. A new `sortMode` on an element (`"auto"` by default, `"hitbox"` to keep the single key, `"slope"` to force the columns) overrides the automatic 16 px slope threshold.
