---
"@rpgjs/server": patch
---

With map streaming, the visibility of a sync packet no longer runs a spatial query per client (#515). The players and the events of the map are indexed by chunk once per sync broadcast, and each client reads the index for its retained chunks. Building the sync packets of 80 clients that each see 80 entities takes about 2 ms instead of 21 ms. The visible entities are the same, with one difference: an event without a physics body is now visible when its position is in a retained chunk.
