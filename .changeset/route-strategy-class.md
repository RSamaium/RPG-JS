---
"@rpgjs/server": patch
---

A character on a route costs less on the server (#516). The movement strategy of `moveRoutes()` was a class declared inside the method: a new class was created at every call, that is at every cycle of an infinite route for every event, and the JavaScript engine could not optimize its `update()`, which runs at every physics step. It is now declared once. With 100 events on `infiniteMoveRoute([Move.tileRandom()])`, a physics step takes about 30 % less time (37 µs per event instead of 53 µs in the bench, half of which is the bench itself).

The route strategy also stops deleting and creating its clamp at every step, and no longer formats its debug messages when they are not printed.
