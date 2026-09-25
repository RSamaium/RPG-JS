---
"@rpgjs/server": patch
---

Split the server map room module into focused files: map types, movement input helpers, the map update schema, event definition helpers, weather/lighting interpolation and touch collision tracking (`MapTouchCollisions`). Public exports and behavior are unchanged.
