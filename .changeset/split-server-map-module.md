---
"@rpgjs/server": patch
---

Split large server modules into focused files. The map room now delegates to map types, input processing (`MapInputProcessor`), update request helpers, event definition helpers, weather/lighting interpolation and touch collision tracking (`MapTouchCollisions`). Player snapshot helpers move to `Player/snapshot`. Public exports and behavior are unchanged.
