---
"@rpgjs/studio": minor
---

Paint the terrain chunks in a worker (on `OffscreenCanvas`) so a map with terrain no longer freezes the page while it loads. The chunks nearest to the middle of the screen are drawn first, and the page falls back to painting itself where workers are not available.
