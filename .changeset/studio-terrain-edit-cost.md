---
"@rpgjs/studio": patch
---

Drawing a terrain chunk again no longer pays for the whole liquid hole each time. The edges of a hole's surface (its contact band, inner transitions and meniscus) are made once per surface instead of once per chunk, and the masks and surfaces of a morphology feature are kept from one render to the next, since a feature that changed is another object. On a map with a large water hole this takes a chunk from about 480 ms to about 110 ms after the first one, and the load of the map takes about half the time. `setStudioTerrainChunkSize(size)` sets the chunk size of the terrain renderers created afterwards, for an editor that wants smaller chunks.

When only some chunks are drawn again (a stroke touched them), the masks and surfaces of the relief are made for those chunks and their surroundings instead of the whole feature, so redrawing after an erase follows the size of what was erased.

The water level of a filled hole (its projected mask and the scan of its pixels) and the foam dots along the edge of a liquid surface are made once per render instead of once per chunk. Redrawing the chunks of a map with a large water hole takes about 60 ms per chunk, from about 270 ms.

The size of a liquid hole (what its water level, insets and edge widths are made from) no longer depends on the part of it that was made when only some chunks are drawn again. A large water hole used to get a smaller, shifted shore after a brush stroke elsewhere, because the geometry was measured on the mask cut to the chunks being redrawn; it is now measured on the strokes of the whole feature.
