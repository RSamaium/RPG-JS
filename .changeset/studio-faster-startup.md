---
"@rpgjs/studio": patch
---

Shorten the time before the first map is shown: the scene no longer asks the worker to paint the same terrain walls several times, only the hero's spritesheets are awaited before the map loads, and the other startup media (combat animations, actors, illustrations) load while the map loads, with the reveal waiting for them at most 800 ms.
