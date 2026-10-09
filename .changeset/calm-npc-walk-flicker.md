---
"@rpgjs/common": patch
"@rpgjs/server": patch
---

Fix the walk / stand flicker of a character that is not really moving (an NPC pushing against an obstacle): the movement animation now follows a movement only once it lasts 120 ms.
