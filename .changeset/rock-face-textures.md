---
"@rpgjs/studio": patch
---

Render the faces of Studio `wallStyle: "rock"` walls without `textureId` per pixel from the wall mask, as the Studio map editor does: faces lit at the top and darker at the foot, covering at most 55% of the opening below them, with a contact shadow on the floor. The new `rockTexture` wall param picks the procedural face texture: `masonry` (default, cut stone courses) or `natural` (irregular weathered rock).
