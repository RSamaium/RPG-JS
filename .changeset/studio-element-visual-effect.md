---
"@rpgjs/studio": minor
---

A map element can play a looping visual effect (`visualEffect: { id, x, y, effect? }`): it is alive only near the viewport, with a cap on the simultaneous effects (`params.maxLoopingEffects`, 24 by default) and a lower particle budget when the cap is reached.
