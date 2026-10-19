---
"@rpgjs/studio": patch
---

Have the warmed terrain workers fetch and decode the terrain atlas as soon as the map data is known, so the first chunk no longer waits for its image.
