# `@rpgjs/render-map2d`

Framework-agnostic CPU renderer for RPGJS Studio terrain. It has no DOM,
CanvasEngine, Pixi, filesystem, or network dependency. Callers decode images and
provide RGBA buffers; the package returns deterministic RGBA regions.

```ts
import { normalizeTerrainMap, prepareTerrainMap, renderTerrainRegion } from "@rpgjs/render-map2d";

const map = normalizeTerrainMap(studioMap);
const prepared = prepareTerrainMap({
  map,
  textures: {
    [map.sourceTexture!]: { width: atlas.width, height: atlas.height, pixels: atlasPixels },
    [map.controlTexture!.source!]: { width: control.width, height: control.height, pixels: controlPixels },
  },
});
const frame = renderTerrainRegion(prepared, {
  bounds: { x: 0, y: 0, width: 1024, height: 768 },
  timeMs: performance.now(),
});
```

`timeMs` is optional. Omitting it produces a stable, static frame. Prepared maps
cache normalized inputs and should be reused across regions and animation frames,
then released with `disposeTerrainMap()`.

Custom presets are local to one prepared map:

```ts
prepareTerrainMap({
  map,
  textures,
  presets: {
    "my-game:lava": ({ width, height, mask, timeMs }) => renderLava(width, height, mask, timeMs),
  },
});
```

Preset callbacks receive only serializable values and typed arrays, so the same
code works on the main thread, in a Web Worker, and in Node.js.

Morphology adapters should use `resolveTerrainMorphologyLiquidGeometry()` for
filled holes. It returns the deterministic level projection, wall opacity and
edge widths used by both the Studio editor and the game renderer.
