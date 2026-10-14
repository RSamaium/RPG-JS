---
"@rpgjs/studio": patch
---

`@rpgjs/studio` draws the terrain textures in workers instead of on the main thread. The grid and control textures, the morphology masks of holes and walls, the water masks, and the slices and shadows of walls are made on `OffscreenCanvas` in up to three workers, by the same painter code the page uses (`StudioTerrainPainter`), and only bitmaps go back to the page: a map that loads, or chunks the map editor redraws after a stroke, no longer keep the page busy. The data of a map is sent to a worker as it changes (a feature of the relief or a region of the control texture that did not change is not sent again), a chunk for data that was replaced while it waited is not drawn, and the page draws the terrain itself where there are no workers or when one fails. The worker code is inlined in the package, so nothing is served beside the game; a Content-Security-Policy needs `blob:` for workers.
