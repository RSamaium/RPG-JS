---
"@rpgjs/client": patch
---

Fix: NPCs and other players no longer replay their old positions after a browser tab was hidden or frozen. The client consumes one movement frame per render tick, so the positions received while the render loop was paused formed a backlog that never drained; the backlog is now collapsed to the latest position.
