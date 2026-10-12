---
"@rpgjs/action-battle": patch
"@rpgjs/studio": patch
"@rpgjs/client": patch
---

Fix the battle music of the project not playing when an enemy is approached. An enemy without its own battle music sent an empty track that hid the project one (Studio now drops empty values and Action Battle falls back to the project music on a blank track). A threat re-sent by a re-created enemy AI no longer piles up, and `engine.music.enter()` ignores a call for the track it already targets instead of cancelling its own transition on every tick (which also created a duplicate sound each time).
