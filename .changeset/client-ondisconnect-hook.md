---
"@rpgjs/client": patch
---

The `onDisconnect(engine, reason, socket)` hook of a client module now runs when the connection closes. The engine fired `client-engine-onDisconnected`, a name no declared hook matched, so `onDisconnect` never ran. `reason` is the close reason of the server (an empty string when there is none). `client-engine-onDisconnected` is still fired, for the modules that used that name.
