---
"@rpgjs/client": patch
"@rpgjs/action-battle": patch
---

Keep temporary attack playback and its direction stable during locomotion synchronization. Ignore stale sprite completion callbacks, return stationary characters to idle, and preserve matching predicted attacks when the server confirms them.
