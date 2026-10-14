import { performance } from "node:perf_hooks";
import { prepareTerrainMap, renderTerrainRegion } from "@rpgjs/render-map2d";
import { CHUNK, chunksTouching, createScene, paintCircle } from "./scene";

/** Kernel cost in Node, on the main thread: what one chunk costs, and what a brush stroke touches. */
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const scene = createScene({ chunksX: 12, chunksY: 8 });
const prepared = prepareTerrainMap({ map: scene.map, textures: { atlas: scene.atlas } });
const bounds = (col: number, row: number) => ({ x: col * CHUNK, y: row * CHUNK, width: CHUNK, height: CHUNK });

const rows: Array<Record<string, unknown>> = [];
const time = (fn: () => void, runs = 5) => {
  fn(); // warm up
  const samples: number[] = [];
  for (let i = 0; i < runs; i += 1) {
    const start = performance.now();
    fn();
    samples.push(performance.now() - start);
  }
  return median(samples);
};

rows.push({ case: "one chunk 512x512 (still)", ms: time(() => renderTerrainRegion(prepared, { bounds: bounds(5, 3) })).toFixed(1) });
rows.push({ case: "one chunk 512x512 (water animated)", ms: time(() => renderTerrainRegion(prepared, { bounds: bounds(5, 3), timeMs: 1234 })).toFixed(1) });
rows.push({ case: "one chunk 256x256", ms: time(() => renderTerrainRegion(prepared, { bounds: { x: 2560, y: 1536, width: 256, height: 256 } })).toFixed(1) });
rows.push({ case: "one chunk 128x128", ms: time(() => renderTerrainRegion(prepared, { bounds: { x: 2560, y: 1536, width: 128, height: 128 } })).toFixed(1) });

for (const radius of [16, 48, 128]) {
  const dirty = paintCircle(scene.control, 1, 2900, 1800, radius, 2);
  const touched = chunksTouching(dirty, 12, 8, 72);
  const ms = time(() => touched.forEach(({ col, row }) => renderTerrainRegion(prepared, { bounds: bounds(col, row), timeMs: 1234 })), 3);
  rows.push({ case: `brush radius ${radius}px: ${touched.length} chunk(s) re-rendered`, ms: ms.toFixed(1) });
}
console.table(rows);
