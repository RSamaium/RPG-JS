---
"@rpgjs/studio": patch
---

Fix the client build of a game that installs `@rpgjs/studio` 5.3.0: the package imported `@rpgjs/map-builder`, which is private and not published. It is now bundled in the Studio `dist`, and the typings no longer refer to it.
