---
"@rpgjs/server": patch
---

Keep `@signe/*` and `rxjs` external in the server build, so that a standalone game shares one copy of the reactive runtime between the client and the server
