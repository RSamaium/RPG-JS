---
"@rpgjs/studio": patch
---

Ask the terrain worker for the next chunk while the page builds the sprite of the previous one, share one paint request per chunk between overlapping renders, and do not repaint a chunk already drawn for the same state.
