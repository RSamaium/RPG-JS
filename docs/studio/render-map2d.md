---
title: "Low-level 2D terrain rendering"
description: "Render RPGJS Studio terrain to deterministic RGBA buffers without a UI framework."
---

# Low-level 2D terrain rendering

`@rpgjs/render-map2d` is the framework-independent terrain renderer used by the
RPGJS Studio editor and game runtime. It does not load files or URLs and does not
depend on the DOM, CanvasEngine, Pixi, or Angular. Decode source images in the
host application and pass their RGBA bytes to the renderer.

## Install

```bash
pnpm add @rpgjs/render-map2d
```

## Render a map or viewport

```ts
import {
  normalizeTerrainMap,
  prepareTerrainMap,
  renderTerrainRegion,
} from "@rpgjs/render-map2d";

const map = normalizeTerrainMap(studioMap);
const terrain = prepareTerrainMap({
  map,
  textures: {
    [map.sourceTexture!]: atlasRgba,
    [map.controlTexture!.source!]: controlTextureRgba,
  },
});

const frame = renderTerrainRegion(terrain, {
  bounds: { x: cameraX, y: cameraY, width: viewportWidth, height: viewportHeight },
  timeMs: performance.now(),
});
```

`atlasRgba` and `controlTextureRgba` have the shape
`{ width, height, pixels: Uint8ClampedArray }`. The returned frame contains the
same shape plus its world `x` and `y`. A Canvas adapter may construct an
`ImageData`; a Pixi adapter may upload the buffer as a texture. The renderer does
not make either choice.

Call `prepareTerrainMap()` once after map or texture data changes, reuse the
prepared value across viewport renders, and call `disposeTerrainMap()` when the
map is unloaded. Omit `timeMs` for a deterministic static result. Supplying the
same inputs and time always produces the same bytes.

## Presets

Built-in identifiers are available through `TerrainPreset`: `GrassEdge`,
`Carpet`, `Water`, `RoadTownSidewalk`, and `RoadTownMarked`. Map metadata stores
these identifiers through its normal render modes. Applications can add a local
preset without global registration:

```ts
const terrain = prepareTerrainMap({
  map,
  textures,
  presets: {
    "my-game:lava": ({ width, height, mask, params, timeMs }) =>
      renderLava({ width, height, mask, params, timeMs }),
  },
});
```

Preset callbacks receive only typed arrays, numbers, and serializable parameters.
They must return exactly `width * height * 4` RGBA bytes. Keep namespaced custom
keys stable because maps persist the shader key.

## Worker usage

The normalized map, raster images, render bounds, and returned pixel buffer are
structured-clone compatible. Transfer the underlying `ArrayBuffer` when posting
large textures or frames between a Web Worker and its host to avoid copying.

Invalid inputs throw `TerrainMapValidationError`. Its `path` property identifies
the invalid field, for example `textures.water.pixels`.

## Morphology adapters

Canvas and Pixi adapters can share the exact recessed-liquid geometry while
they progressively migrate their rasterization to `renderTerrainRegion()`:

```ts
const geometry = resolveTerrainMorphologyLiquidGeometry({
  bounds: alphaBounds,
  depth: 20,
  fillHeight: 100,
  tileSize: 48,
});
```

At full height, `wallAlpha` and `dropY` are zero. `inset` and the returned edge
metrics remain deterministic, which keeps the water contact border identical
between the Studio editor and game renderer. The helper accepts and returns only
numbers and plain objects.
