---
"@rpgjs/map-builder": patch
---

Fixes from the review of the map builder branch.

- A `terrain.paint` whose cost (pixels x stroke segments) is too high is refused by the patch handler and by `requireTerrain`, so a client cannot stall the authority with a huge stroke.
- The remote committer settles a request whose own change is answered with a revision it already has, or with a gap, instead of failing it with `timeout`.
- The client gives up a join still waiting for another map when the scene changes.
- The server flushes the authority of a map when its last player leaves.
