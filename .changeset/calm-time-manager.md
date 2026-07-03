---
"@rpgjs/common": patch
"@rpgjs/server": patch
"@rpgjs/client": patch
---

Add a shared `withTimeManager()` module that synchronizes authoritative map time snapshots, exposes server and client time managers, supports calendars and pause/scale controls, and can optionally drive map lighting and weighted weather ambiences without adding new public methods to `RpgMap`.
