# Terrain feasibility gate: results

Run on one machine (Intel UHD 770 integrated GPU through ANGLE/Mesa, 20 logical cores, Chrome 152 headless with GPU flags, 4 workers), on a synthetic 96-chunk map. Timings vary by about 30 % from run to run on this machine (the same 512 px chunk took 290 ms in Node and 360 to 480 ms in a worker): read them as orders of magnitude.

## 1. Can a brush stroke re-render the affected region within a frame budget?

**Not with the kernel as it is, yes with three changes.**

The kernel (`renderTerrainRegion`) costs about 290 ms for a 512 px chunk, and its cost follows the area it renders *including a margin of three tiles on every side* (144 px for the default tile size of 48). That margin makes a 32 px request cost as much as a 512 px one divided by six:

| Region asked | margin 144 px (default) | margin 48 px | margin 24 px |
| --- | --- | --- | --- |
| 32 x 32 | 44 ms | 6.5 ms | 3.7 ms |
| 64 x 64 | 54 ms | 10 ms | 6.6 ms |
| 128 x 128 | 74 ms | 20 ms | 15 ms |
| 256 x 256 | 127 ms | 51 ms | 41 ms |
| 512 x 512 | 274 ms | 152 ms | 137 ms |

The three changes, all measured:

1. **A `margin` option on `renderTerrainRegion`** (added to `@rpgjs/render-map2d`, backwards compatible). The margin only has to cover the widest blend of the map (24 px here): with 24 px or more the pixels are **identical** to a large render (40 random regions, 0 different pixels); with 16 px or less they are not.
2. **The right dirty rectangle.** A changed mask changes pixels up to one blend radius *outside* the dab, so the rectangle to re-render is the dab grown by the widest blend, and rendering it needs one more blend of margin. Re-rendering only the dab leaves visible seams.
3. **Workers, with ordered application.** Several workers return frames in any order: applying a slower, older frame after a newer one silently put stale pixels back (the integrity check below caught it). Frames are applied in stroke order.

Brush stroke of 90 dabs at 60 Hz across several chunks (dab radius r), dirty rectangle grown by 24 px, margin 24 px:

| Variant | Kernel per dab (p50) | Main thread per dab | Dab to screen (p50 / p95) | Frames over 33 ms |
| --- | --- | --- | --- | --- |
| main thread, kernel default margin, r=24 | 81 ms | 81 ms | 81 / 88 ms | 90 of 90 |
| main thread, margin 24, r=24 | 12 ms | 13 ms | 13 / 16 ms | 0 |
| main thread, margin 24, r=64 | 32 ms | 32 ms | 32 / 37 ms | 78 of 90 |
| 4 workers, r=24 | 12 ms | 0.1 ms | 13 / 21 ms | 0 |
| 4 workers, r=64 | 39 ms | 0.2 ms | 40 / 50 ms | 0 |
| 4 workers, r=128, one job per dab | 77 ms | 0.3 ms | 228 / 349 ms (the queue grows) | 0 |
| 4 workers, r=64, dirty rectangles coalesced | 28 ms | 0.2 ms | 29 / 32 ms | 0 |
| 4 workers, r=128, dirty rectangles coalesced | 80 ms | 0.3 ms | 94 / 125 ms | 0 |

- On the main thread only small brushes fit a frame (r=24 at about 13 ms, with no headroom for the rest of a game frame). Anything bigger needs workers.
- With workers the main thread stays free (frame time flat at 16.7 ms, the main-thread work per dab is a message) and the stroke shows up 13 to 50 ms after the pointer for brushes up to r=64.
- A big brush saturates the pool if every dab is a job (kernel 77 ms x 60 dabs/s / 4 workers > 1): coalescing the dirty rectangles into one job per free worker keeps the latency bounded (94 ms at r=128).
- The initial render of the whole map (96 chunks) takes about 9 to 12 s in four workers while the page keeps its 16.7 ms frames: it has to be progressive, from the visible chunks outward, or come from a cache.
- Memory: 96 chunk textures of 512 x 512 are about 96 MB on the GPU, and the page used about 150 MB of JS heap.

## 2. Is the Pixi output close enough to the current one?

**Identical.** Both the editor (Canvas 2D) and the game (Pixi) display the RGBA produced by the same kernel. For a 512 x 512 chunk, 262,144 opaque pixels: kernel vs `putImageData` + `getImageData`, kernel vs Pixi WebGL (canvas texture, nearest filtering, 1:1), and Canvas 2D vs Pixi: **0 different pixels, worst channel delta 0**. The one condition is to show chunks at 1:1 with nearest filtering and no premultiplied-alpha surprise (the terrain is opaque).

Integrity of partial updates: after all the strokes above (hundreds of partial updates split across chunk borders), 30 chunks were compared with a fresh full render: **0 different pixels**, once frames are applied in order.

## 3. Do `render-map2d` and workers keep the main thread free?

**Yes.** The kernel has no DOM dependency and runs in a worker as is; frames come back as transferables. The rendering of the initial map in four workers did not disturb the main thread (frames 16.6 ms p50, 17.5 ms p95).

## What this does not cover

- One machine and one synthetic scene: no morphology (holes, walls), nine-slice, road presets or tilesets of a real Studio project. The kernel cost depends on the materials and modes of the map; re-measure on a real project during milestone 2.
- **Animated water.** Re-rendering water every frame with the CPU kernel is out of reach (a chunk costs as much animated as still). What the Studio runtime does today for display (`StudioTerrainChunkRenderer`) is not changed by this prototype; the terrain feature must keep that path for display and use the kernel for the edited regions.
- Real input: pointer events, pressure, and a brush that is not a plain disc.
- Low-end GPUs and mobile: only an integrated desktop GPU was tried. Software rendering was not measured.
- The control mask here is at 1 px per world pixel. A coarser mask is cheaper to patch and to send; it was not measured.

## Decision

**Proceed with milestone 2, with live painting designed around workers.** Display is not a risk (identical pixels); live painting is feasible within a frame budget as long as: the kernel keeps its `margin` option, edits are re-rendered in dirty rectangles grown by the widest blend, the work runs in a worker pool with ordered application and coalescing, and the first render is progressive. The patch format for painted terrain follows from this: a stroke patch carries a disc (or polyline) and a material, so that every worker applies it to its own copy of the mask, as the prototype does.
