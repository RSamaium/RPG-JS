---
"@rpgjs/server": patch
---

The Node transport no longer logs the values of the WebSocket query. The query carries application bearer tokens, the `transferToken` of a map change and the private session key (`_pk`) of the connection, and the `Room: …, Query params:` line wrote them in plain text at every join, reconnection and map transfer. It now logs only the names of the parameters.
