---
"@rpgjs/map-builder": patch
---

Fixes found while building the playground game: the client view now advances its effects (shake, blink) with the engine step (`onStep`), and the server module tracks connections by player id, so a player who changes map is correctly disconnected from the authority of the map they left.
