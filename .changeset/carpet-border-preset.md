---
"@rpgjs/render-map2d": minor
"@rpgjs/studio": patch
---

The `carpet` and `carpet-border` terrain presets draw a real carpet border instead of two lines: a dark outline, a binding, a darker band with a motif repeated along the edge (whole motifs only, none in the corners), an inner line, a soft inner shadow and a thin shadow on the floor around the carpet. The colours come from the texture of the carpet (`source`): the binding and the motif take the colour of its patterns. It still follows any outline and scales with the tile size. `params`: `motif` (`"diamond"`, `"dot"`, `"none"`), `trimColor` (`"#rrggbb"`), `scale` (0.5 to 1.1), `shadow` (`false` to draw none). `createTerrainCarpetBorderOverlayPixels` accepts `source`, `params`, `originX` and `originY`. The Studio chunk painter gives the presets the world origin of the chunk, so the motif continues from one chunk to the next.
