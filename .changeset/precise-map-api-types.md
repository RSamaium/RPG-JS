---
"@rpgjs/server": patch
---

Tighten public map API types: `map.processInput()` returns `RpgMovementInput[]`, `map.setSync()` takes a typed `RpgMapSyncSchema` (`$initial`, `$syncWithClient`, `$permanent`), and `addInDatabase()` / `showComponentAnimation()` accept `unknown` payloads instead of `any`. `pnpm test:types` now really type-checks the public API type tests.
