import { Application, Container, Rectangle, Sprite, Texture } from "pixi.js";
import { prepareTerrainMap, renderTerrainRegion } from "@rpgjs/render-map2d";
import { CHUNK, GROW, createScene, paintCircle } from "./scene";

/**
 * Feasibility gate for live-editable terrain on Pixi (MAP_BUILDER.md, "Decision gate").
 * Everything is measured in this page; results land in `window.__gate` and in the page.
 */
const OPTIONS = { chunksX: 12, chunksY: 8 } as const; // 96 chunks: the largest map of the spec
const VIEW = { width: 1280, height: 720 };
const WORKERS = Math.max(1, Math.min(4, (navigator.hardwareConcurrency ?? 4) - 1));

const out = document.getElementById("out")!;
const results: Record<string, unknown> = {};
(window as unknown as { __gate: unknown }).__gate = results;
const log = (text: string) => { out.textContent = `${text}\n${out.textContent}`; };
const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));
const quantile = (values: number[], q: number) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * q))];
const stats = (values: number[]) => ({ n: values.length, p50: +quantile(values, 0.5).toFixed(2), p95: +quantile(values, 0.95).toFixed(2), max: +Math.max(...values).toFixed(2) });

// --- scene (the main thread keeps its own copy: it is also what the sync variant renders from) ---
const scene = createScene(OPTIONS);
const prepared = prepareTerrainMap({ map: scene.map, textures: { atlas: scene.atlas } });

// --- Pixi: one canvas-backed texture per chunk ---
const app = new Application();
await app.init({ width: VIEW.width, height: VIEW.height, background: 0x111111, resolution: 1, autoDensity: false, antialias: false, preference: "webgl" });
document.getElementById("host")!.appendChild(app.canvas);
const world = new Container();
app.stage.addChild(world);
interface Chunk { col: number; row: number; canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; texture: Texture; sprite: Sprite; dirty: boolean }
const chunks = new Map<string, Chunk>();
for (let row = 0; row < OPTIONS.chunksY; row += 1) {
  for (let col = 0; col < OPTIONS.chunksX; col += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = CHUNK;
    const ctx = canvas.getContext("2d", { willReadFrequently: false })!;
    const texture = Texture.from(canvas);
    texture.source.scaleMode = "nearest";
    const sprite = new Sprite(texture);
    sprite.position.set(col * CHUNK, row * CHUNK);
    world.addChild(sprite);
    chunks.set(`${col},${row}`, { col, row, canvas, ctx, texture, sprite, dirty: false });
  }
}
const gl = (app.renderer as unknown as { gl?: WebGL2RenderingContext }).gl;
const debug = gl?.getExtension("WEBGL_debug_renderer_info");
results.environment = {
  renderer: debug ? gl!.getParameter(debug.UNMASKED_RENDERER_WEBGL) : app.renderer.name,
  rendererType: app.renderer.name,
  hardwareConcurrency: navigator.hardwareConcurrency,
  workers: WORKERS,
  chunks: chunks.size,
  mapPx: `${scene.map.width}x${scene.map.height}`,
};

const putFrame = (frame: { x: number; y: number; width: number; height: number; pixels: Uint8ClampedArray }) => {
  // A frame may straddle chunks: write each part where it belongs.
  const c0 = Math.floor(frame.x / CHUNK), c1 = Math.floor((frame.x + frame.width - 1) / CHUNK);
  const r0 = Math.floor(frame.y / CHUNK), r1 = Math.floor((frame.y + frame.height - 1) / CHUNK);
  const image = new ImageData(frame.pixels as Uint8ClampedArray<ArrayBuffer>, frame.width, frame.height);
  for (let r = r0; r <= r1; r += 1) for (let c = c0; c <= c1; c += 1) {
    const chunk = chunks.get(`${c},${r}`);
    if (!chunk) continue;
    chunk.ctx.putImageData(image, frame.x - c * CHUNK, frame.y - r * CHUNK, Math.max(0, c * CHUNK - frame.x), Math.max(0, r * CHUNK - frame.y), Math.min(CHUNK, frame.x + frame.width - c * CHUNK), Math.min(CHUNK, frame.y + frame.height - r * CHUNK));
    chunk.dirty = true;
  }
};
const uploadDirty = () => {
  let count = 0;
  for (const chunk of chunks.values()) if (chunk.dirty) { chunk.texture.source.update(); chunk.dirty = false; count += 1; }
  return count;
};

// --- workers ---
interface Pool { workers: Worker[]; render(job: Omit<Parameters<Worker["postMessage"]>[0], never> & Record<string, unknown>): Promise<any>; paint(p: Record<string, number>): void; terminate(): void }
async function createPool(count: number): Promise<Pool> {
  const waiting = new Map<number, (frame: any) => void>();
  let jobId = 0;
  let next = 0;
  const workers = Array.from({ length: count }, () => new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }));
  await Promise.all(workers.map((worker) => new Promise<void>((resolve) => {
    worker.onmessage = (event) => {
      if (event.data.type === "ready") resolve();
      else if (event.data.type === "frame") waiting.get(event.data.job)?.(event.data);
    };
    worker.postMessage({ type: "init", options: OPTIONS });
  })));
  return {
    workers,
    render(job) {
      const id = ++jobId;
      return new Promise((resolve) => { waiting.set(id, (frame) => { waiting.delete(id); resolve(frame); }); workers[next++ % workers.length].postMessage({ type: "render", job: id, ...job }); });
    },
    paint(p) { for (const worker of workers) worker.postMessage({ type: "paint", ...p }); },
    terminate() { workers.forEach((worker) => worker.terminate()); },
  };
}

// --- a frame-time probe that keeps running while something else works ---
function probe() {
  const deltas: number[] = [];
  let last = performance.now();
  let alive = true;
  const tick = () => { if (!alive) return; const now = performance.now(); deltas.push(now - last); last = now; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  return { stop() { alive = false; return deltas; } };
}

// --- 1. initial render of the whole map, in workers: the main thread must stay free ---
const pool = await createPool(WORKERS);
{
  const frameProbe = probe();
  const start = performance.now();
  const kernel: number[] = [];
  await Promise.all([...chunks.values()].map(async (chunk) => {
    const frame = await pool.render({ x: chunk.col * CHUNK, y: chunk.row * CHUNK, width: CHUNK, height: CHUNK, timeMs: 0 });
    kernel.push(frame.kernelMs);
    putFrame({ ...frame, pixels: frame.pixels });
  }));
  const total = performance.now() - start;
  const uploadStart = performance.now();
  const uploaded = uploadDirty();
  app.renderer.render(app.stage);
  const deltas = frameProbe.stop();
  results.initialRender = {
    chunks: chunks.size, workers: WORKERS, wallMs: +total.toFixed(0), kernelMsPerChunk: stats(kernel),
    uploadAllMs: +(performance.now() - uploadStart).toFixed(1), uploaded,
    frameDeltasWhileRendering: stats(deltas),
  };
  log(`initial render done in ${total.toFixed(0)} ms`);
}

// --- 2. brush strokes ---
interface Variant { name: string; mode: "main" | "workers" | "coalesced"; margin?: number; radius: number }
async function stroke(variant: Variant) {
  const dabs = 90;
  const frameProbe = probe();
  const handlerMs: number[] = [];
  const latencyMs: number[] = [];
  const kernelMs: number[] = [];
  const uploadMs: number[] = [];
  const pending: Array<Promise<void>> = [];
  let touched = 0;
  // Frames come back in any order (several workers). A frame computed for an older state must never
  // overwrite a newer one, so they are applied in the order the strokes were made.
  const arrived = new Map<number, () => void>();
  let applyNext = 0;
  const applyInOrder = (seq: number, apply: () => void) => {
    arrived.set(seq, apply);
    while (arrived.has(applyNext)) { arrived.get(applyNext)!(); arrived.delete(applyNext); applyNext += 1; }
  };
  // Coalescing: what is dirty is sent as one job per free worker, never one job per dab.
  let acc: { x0: number; y0: number; x1: number; y1: number; times: number[] } | undefined;
  let inFlight = 0;
  let seq = 0;
  const jobsSent: number[] = [];
  const dispatch = () => {
    if (!acc) return;
    const { x0, y0, x1, y1, times } = acc;
    acc = undefined;
    const mine = seq;
    seq += 1;
    inFlight += 1;
    jobsSent.push((x1 - x0) * (y1 - y0));
    const margin = variant.margin;
    pending.push(pool.render({ x: x0, y: y0, width: x1 - x0, height: y1 - y0, timeMs: 0, ...(margin !== undefined ? { margin } : {}) }).then((frame) => {
      kernelMs.push(frame.kernelMs);
      applyInOrder(mine, () => {
        inFlight -= 1;
        putFrame(frame);
        const u0 = performance.now();
        touched += uploadDirty();
        uploadMs.push(performance.now() - u0);
        for (const t of times) latencyMs.push(performance.now() - t);
        if (acc && inFlight < WORKERS) dispatch();
      });
    }));
  };
  const begin = performance.now();
  for (let i = 0; i < dabs; i += 1) {
    // A pointer reports at about 60 Hz: dab `i` happens at begin + i * 16.7 ms, however fast frames come.
    await new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, begin + i * (1000 / 60) - performance.now())));
    const t0 = performance.now();
    const cx = 2600 + i * 14;
    const cy = 1700 + Math.sin(i / 9) * 260;
    const material = 1 + (Math.floor(i / 30) % 4);
    const dirty = paintCircle(scene.control, scene.scale, cx, cy, variant.radius, material);
    // Pixels change up to one blend around the dab, and rendering them needs one more blend of context.
    const x0 = Math.max(0, Math.floor(dirty.x) - GROW), y0 = Math.max(0, Math.floor(dirty.y) - GROW);
    const bounds = {
      x: x0, y: y0,
      width: Math.min(scene.map.width, Math.ceil(dirty.x + dirty.width) + GROW) - x0,
      height: Math.min(scene.map.height, Math.ceil(dirty.y + dirty.height) + GROW) - y0,
    };
    const margin = variant.margin;
    // Every stroke is a `terrain.paint` for everybody: the workers' copy of the mask follows, whoever renders.
    if (variant.mode === "main") pool.paint({ cx, cy, radius: variant.radius, material });
    if (variant.mode === "main") {
      const frame = renderTerrainRegion(prepared, { bounds, timeMs: 0, ...(margin !== undefined ? { margin } : {}) });
      kernelMs.push(performance.now() - t0);
      putFrame(frame);
      const u0 = performance.now();
      touched += uploadDirty();
      uploadMs.push(performance.now() - u0);
      latencyMs.push(performance.now() - t0);
    } else if (variant.mode === "coalesced") {
      pool.paint({ cx, cy, radius: variant.radius, material });
      // Dirty rectangles pile up in `acc` and leave as one job as soon as a worker is free.
      acc = acc ? { x0: Math.min(acc.x0, bounds.x), y0: Math.min(acc.y0, bounds.y), x1: Math.max(acc.x1, bounds.x + bounds.width), y1: Math.max(acc.y1, bounds.y + bounds.height), times: [...acc.times, t0] } : { x0: bounds.x, y0: bounds.y, x1: bounds.x + bounds.width, y1: bounds.y + bounds.height, times: [t0] };
      if (inFlight < WORKERS) dispatch();
    } else {
      pool.paint({ cx, cy, radius: variant.radius, material });
      pending.push(pool.render({ ...bounds, timeMs: 0, ...(margin !== undefined ? { margin } : {}) }).then((frame) => {
        kernelMs.push(frame.kernelMs);
        applyInOrder(i, () => {
          putFrame(frame);
          const u0 = performance.now();
          touched += uploadDirty();
          uploadMs.push(performance.now() - u0);
          latencyMs.push(performance.now() - t0);
        });
      }));
    }
    handlerMs.push(performance.now() - t0);
  }
  while (acc || inFlight > 0) { if (acc && inFlight < WORKERS) dispatch(); await new Promise((r) => setTimeout(r, 2)); }
  await Promise.all(pending);
  await nextFrame();
  const deltas = frameProbe.stop();
  return {
    variant: variant.name,
    kernelMsPerDab: stats(kernelMs),
    mainThreadMsPerDab: stats(handlerMs),
    uploadMsPerDab: stats(uploadMs),
    dabToScreenMs: stats(latencyMs),
    frameDeltas: stats(deltas),
    framesOver33ms: deltas.filter((d) => d > 33).length,
    chunkUploads: touched,
    ...(variant.mode === "coalesced" ? { jobs: jobsSent.length, jobAreaKpx: stats(jobsSent.map((a) => a / 1000)) } : {}),
  };
}

const variants: Variant[] = [
  { name: "main thread, default margin, r=24", mode: "main", radius: 24 },
  { name: "main thread, margin 24, r=24", mode: "main", margin: GROW, radius: 24 },
  { name: "main thread, margin 24, r=64", mode: "main", margin: GROW, radius: 64 },
  { name: `${WORKERS} workers, margin 24, r=24`, mode: "workers", margin: GROW, radius: 24 },
  { name: `${WORKERS} workers, margin 24, r=64`, mode: "workers", margin: GROW, radius: 64 },
  { name: `${WORKERS} workers, margin 24, r=128`, mode: "workers", margin: GROW, radius: 128 },
  { name: `${WORKERS} workers coalesced, margin 24, r=64`, mode: "coalesced", margin: GROW, radius: 64 },
  { name: `${WORKERS} workers coalesced, margin 24, r=128`, mode: "coalesced", margin: GROW, radius: 128 },
];
results.strokes = [];
for (const variant of variants) {
  // Workers must see the same control mask as the main thread before each run: re-sync by repainting is overkill, the scenes only differ by earlier strokes.
  (results.strokes as unknown[]).push(await stroke(variant));
  log(`stroke "${variant.name}" done`);
}

// --- 3. fidelity: kernel pixels vs what Pixi shows, vs Canvas 2D ---
{
  const bounds = { x: 5 * CHUNK, y: 3 * CHUNK, width: CHUNK, height: CHUNK };
  const frame = renderTerrainRegion(prepared, { bounds, timeMs: 0 });
  // Canvas 2D path (what the editor does): putImageData, read back.
  const c2d = document.createElement("canvas");
  c2d.width = CHUNK; c2d.height = CHUNK;
  const ctx = c2d.getContext("2d")!;
  ctx.putImageData(new ImageData(frame.pixels.slice() as Uint8ClampedArray<ArrayBuffer>, CHUNK, CHUNK), 0, 0);
  const viaCanvas = ctx.getImageData(0, 0, CHUNK, CHUNK).data;
  // Pixi path: show the frame as a chunk, then read the pixels Pixi drew.
  const chunk = chunks.get("5,3")!;
  chunk.ctx.putImageData(new ImageData(frame.pixels.slice() as Uint8ClampedArray<ArrayBuffer>, CHUNK, CHUNK), 0, 0);
  chunk.texture.source.update();
  world.position.set(-5 * CHUNK, -3 * CHUNK);
  app.renderer.render(app.stage);
  const extracted = app.renderer.extract.pixels({ target: app.stage, frame: new Rectangle(0, 0, CHUNK, CHUNK), resolution: 1 });
  const diff = (a: ArrayLike<number>, b: ArrayLike<number>) => {
    let different = 0, worst = 0, opaque = 0;
    for (let i = 0; i < a.length; i += 4) {
      const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]), Math.abs(a[i + 3] - b[i + 3]));
      if (d > 0) different += 1;
      if (d > worst) worst = d;
      if (a[i + 3] === 255) opaque += 1;
    }
    return { pixels: a.length / 4, opaque, different, worstChannelDelta: worst };
  };
  results.fidelity = {
    "kernel vs Canvas 2D (putImageData + getImageData)": diff(frame.pixels, viaCanvas),
    "kernel vs Pixi (canvas texture, nearest, 1:1)": diff(frame.pixels, extracted.pixels),
    "Canvas 2D vs Pixi": diff(viaCanvas, extracted.pixels),
  };
}

// --- 4. integrity: after all those partial updates, is every chunk what a fresh full render gives? ---
{
  // The workers and the main thread painted the same strokes: re-render every touched chunk from scratch and compare.
  const fresh = prepareTerrainMap({ map: scene.map, textures: { atlas: scene.atlas } });
  let compared = 0, wrongChunks = 0, wrongPixels = 0;
  const samples: unknown[] = [];
  const started = performance.now();
  for (const chunk of chunks.values()) {
    if (chunk.row < 1 || chunk.row > 5 || chunk.col < 3 || chunk.col > 8) continue; // the area the strokes crossed, with a border
    const reference = renderTerrainRegion(fresh, { bounds: { x: chunk.col * CHUNK, y: chunk.row * CHUNK, width: CHUNK, height: CHUNK }, timeMs: 0 });
    const shown = chunk.ctx.getImageData(0, 0, CHUNK, CHUNK).data;
    let wrong = 0;
    for (let i = 0; i < shown.length; i += 4) if (shown[i] !== reference.pixels[i] || shown[i + 1] !== reference.pixels[i + 1] || shown[i + 2] !== reference.pixels[i + 2]) {
      wrong += 1;
      if (samples.length < 6) samples.push({ x: chunk.col * CHUNK + (i / 4) % CHUNK, y: chunk.row * CHUNK + Math.floor(i / 4 / CHUNK), shown: [...shown.slice(i, i + 3)], expected: [...reference.pixels.slice(i, i + 3)] });
    }
    compared += 1;
    if (wrong) wrongChunks += 1;
    wrongPixels += wrong;
  }
  results.integrity = { chunksCompared: compared, chunksDifferent: wrongChunks, pixelsDifferent: wrongPixels, samples, ms: +(performance.now() - started).toFixed(0) };
}

pool.terminate();
results.memory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory ? { jsHeapMB: +((performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize / 1048576).toFixed(0) } : "n/a";
results.done = true;
out.textContent = JSON.stringify(results, null, 2);
