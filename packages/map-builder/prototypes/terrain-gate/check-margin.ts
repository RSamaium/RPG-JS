import { prepareTerrainMap, renderTerrainRegion } from "@rpgjs/render-map2d";
import { createScene, rng } from "./scene";

/** What margin around a dirty rectangle still gives the exact pixels of a big render? */
const scene = createScene({ chunksX: 12, chunksY: 8 });
const prepared = prepareTerrainMap({ map: scene.map, textures: { atlas: scene.atlas } });
const random = rng(5);
const rects = Array.from({ length: 40 }, () => {
  const size = 48 + Math.floor(random() * 80);
  return { x: Math.floor(random() * (6144 - size)), y: Math.floor(random() * (4096 - size)), width: size, height: size };
});
const rows: Array<Record<string, unknown>> = [];
for (const margin of [0, 8, 16, 24, 32, 48, 64, 96]) {
  let wrongRects = 0;
  let wrongPixels = 0;
  let worst = 0;
  for (const bounds of rects) {
    const reference = renderTerrainRegion(prepared, { bounds, timeMs: 777 });
    const candidate = renderTerrainRegion(prepared, { bounds, timeMs: 777, margin });
    let wrong = 0;
    for (let i = 0; i < reference.pixels.length; i += 4) {
      const d = Math.abs(reference.pixels[i] - candidate.pixels[i]) + Math.abs(reference.pixels[i + 1] - candidate.pixels[i + 1]) + Math.abs(reference.pixels[i + 2] - candidate.pixels[i + 2]) + Math.abs(reference.pixels[i + 3] - candidate.pixels[i + 3]);
      if (d > 0) wrong += 1;
      if (d > worst) worst = d;
    }
    if (wrong > 0) wrongRects += 1;
    wrongPixels += wrong;
  }
  rows.push({ margin, "rects not identical": `${wrongRects}/${rects.length}`, "pixels different": wrongPixels, "worst channel sum": worst });
}
console.table(rows);
