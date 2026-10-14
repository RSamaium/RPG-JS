---
"@rpgjs/map-builder": patch
---

Painted terrain (experimental): `@rpgjs/map-builder/terrain` (data under `extensions.terrain`, a chunked run-length encoded control mask, the `terrain.paint`, `terrain.region`, `terrain.materials` and `terrain.morphology` patches with exact inverses, `defineTerrain` and `paint.*` to write a terrain in code, the `terrain.paint` intent, the brush tool and the `requireTerrain`, `withinTerrain` and `maxRadius` steps), `@rpgjs/map-builder/terrain-render` (the kernel of `@rpgjs/render-map2d`, inline or in a pool of workers) and a `terrain()` feature that draws it on chunk textures, re-rendering only what a stroke touches. `FeatureHost` gains `onViewport`; the authority and the client accept `patchHandlers`.
