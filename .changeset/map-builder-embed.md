---
"@rpgjs/map-builder": patch
---

Editor channels (experimental), `@rpgjs/map-builder/embed`: a game embedded in an iframe can let a Studio join the authority of its map as a trusted session, drive its tools (modes, brush, placement, selection) and pause it. `createEditorHost` is the game's end, `connectEditorFrame` the Studio's. A private `MessageChannel` after a handshake that checks the origin and the window of both ends; every message is parsed strictly.
