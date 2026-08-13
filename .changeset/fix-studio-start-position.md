---
"@rpgjs/studio": patch
---

Use the native named map start position when spawning players in Studio games,
avoiding asynchronous database refreshes moving a player away from the `(0, 0)`
sentinel before the configured start position is applied.
