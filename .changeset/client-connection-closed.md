---
"@rpgjs/client": minor
---

`provideMmorpg({ onConnectionClosed({ code, reason, willReconnect }) })` and the client module hook `engine.onConnectionClosed(engine, info)` report every connection that ends, including after the player moved from the lobby to a map room (a server ending a session with `conn.close(4401, ...)` was not reported to the game). A clean close (code 1000), the close of a room change and `disconnect()` are not reported. `willReconnect` is `false` for the application codes 4000-4999.
