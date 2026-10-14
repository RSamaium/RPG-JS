---
"@rpgjs/client": patch
---

Fix NPCs and other players replaying their movement at high speed when a browser tab becomes visible again. The queue of movement frames, consumed one per tick (the tick is paused in a hidden tab while the server keeps sending), is bounded to the latest frames while the tab is hidden; a visible tab keeps every frame.
