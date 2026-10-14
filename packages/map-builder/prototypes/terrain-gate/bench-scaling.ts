import { performance } from "node:perf_hooks";
import { prepareTerrainMap, renderTerrainRegion } from "@rpgjs/render-map2d";
import { createScene } from "./scene";

/** How the kernel cost scales with the rectangle asked for, and with the margin it adds around it (3 x tileSize). */
const scene = createScene({ chunksX: 12, chunksY: 8 });
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const rows: Array<Record<string, unknown>> = [];
for (const tileSize of [48, 16, 8]) {
  const map = { ...scene.map, tileSize };
  const prepared = prepareTerrainMap({ map, textures: { atlas: scene.atlas } });
  for (const size of [32, 64, 128, 256, 512]) {
    const bounds = { x: 2600, y: 1700, width: size, height: size };
    renderTerrainRegion(prepared, { bounds });
    const samples: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const start = performance.now();
      const frame = renderTerrainRegion(prepared, { bounds });
      samples.push(performance.now() - start);
      if (frame.width !== size) throw new Error("unexpected frame size");
    }
    rows.push({ "margin (3 x tileSize)": `${Math.max(24, tileSize * 3)} px`, region: `${size}x${size}`, ms: median(samples).toFixed(1) });
  }
}
console.table(rows);
