---
"@rpgjs/common": patch
"@rpgjs/server": patch
---

Restore authoritative player onMove hooks and dispatch onDisconnected from lobby, map, and gameplay rooms. Do not report successful room transfers as disconnections or dispatch duplicate disconnection hooks for the same connection.
