# Terrain feasibility gate (prototype, not shipped)

Throwaway code that answers the three questions of the "Decision gate — terrain feasibility" of `MAP_BUILDER.md`. It is not part of the package build (`files` only ships `dist`). Results and the decision: [RESULTS.md](./RESULTS.md); raw numbers of the last run: `results.json`.

| File | What it does |
| --- | --- |
| `scene.ts` | A synthetic 12 x 8 chunk map (6144 x 4096 px, 96 chunks of 512 px): five materials, fades, a hard transition, animated water with border and foam, a pixel-resolution control mask, `paintCircle`. |
| `bench-node.ts`, `bench-scaling.ts`, `check-margin.ts` | The kernel (`@rpgjs/render-map2d`) in Node: cost of a chunk, cost by region size and margin, and which margin still gives exact pixels. |
| `worker.ts`, `browser.ts`, `index.html` | The page: chunk textures in Pixi (WebGL), brush strokes on the main thread and in a pool of workers, fidelity and integrity checks. |
| `run-chrome.mjs` | Runs the page in a local Chrome with GPU flags and prints `window.__gate`. |

```bash
# from packages/map-builder
../../node_modules/.bin/vite --config prototypes/terrain-gate/vite.config.ts &   # http://localhost:5193
node prototypes/terrain-gate/run-chrome.mjs                                     # needs /usr/bin/google-chrome and playwright-core
../../node_modules/.bin/tsx prototypes/terrain-gate/bench-node.ts
```
