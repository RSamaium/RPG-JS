---
"@rpgjs/studio": patch
---

Fix Studio maps with a `scale`: only the map is scaled. The characters/events layer is no longer scaled twice, and the physical world (map size, element/polygon/terrain hitboxes) is expressed in scaled pixels, like the start position and the events, so the camera, the hero and the collisions line up with the scaled map.
