---
"@rpgjs/client": patch
"@rpgjs/server": patch
"@rpgjs/studio": patch
---

Preserve weather WebSocket payloads through server reconciliation and render
them as authoritative so runtime updates and `clearWeather()` replace weather
initially configured in Studio map data.
