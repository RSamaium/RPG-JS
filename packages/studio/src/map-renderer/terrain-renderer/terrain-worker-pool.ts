import type { TerrainPaintBackend } from "./terrain-paint-backend";
import { StudioTerrainPainter } from "./terrain-painter";
import { supportsTerrainWorker, TerrainWorkerBackend, type TerrainWorkerTransport } from "./terrain-worker-backend";
import type { TerrainWorkerRequest, TerrainWorkerResponse } from "./terrain-worker-protocol";

interface SharedWorker {
  worker: Worker;
  users: number;
  listeners: Set<(response: TerrainWorkerResponse) => void>;
  failures: Set<(error: unknown) => void>;
}

/**
 * The workers of the page. The renderers of a map (terrain, walls, shadows, liquids) each keep their state in one of them
 * and take turns with the others that share it: a worker draws one thing at a time, so there are a few, and the chunks
 * of the terrain do not wait behind a wall.
 */
const pool: SharedWorker[] = [];
const MAX_WORKERS = 3;

function startWorker(TerrainPaintWorker: new () => Worker): SharedWorker {
  const worker = new TerrainPaintWorker();
  const entry: SharedWorker = { worker, users: 0, listeners: new Set(), failures: new Set() };
  worker.addEventListener("message", (event: MessageEvent<TerrainWorkerResponse>) => {
    for (const listener of [...entry.listeners]) listener(event.data);
  });
  const fail = (error: unknown): void => {
    const index = pool.indexOf(entry);
    if (index >= 0) pool.splice(index, 1);
    worker.terminate();
    for (const failure of [...entry.failures]) failure(error);
  };
  worker.addEventListener("error", (event) => fail(event.error ?? new Error(event.message)));
  worker.addEventListener("messageerror", (event) => fail(event));
  return entry;
}

/**
 * A way to a worker that draws the terrain, started on the first use, or `null` where there is none. Its code is part of
 * this package (inlined), so nothing has to be served beside the game.
 */
export async function openSharedTerrainWorker(): Promise<TerrainWorkerTransport | null> {
  let entry: SharedWorker | undefined;
  try {
    const { default: TerrainPaintWorker } = await import("./terrain-paint.worker?worker&inline");
    // A new worker while there are fewer than the most, else the one with the fewest renderers.
    entry =
      pool.length < MAX_WORKERS
        ? startWorker(TerrainPaintWorker)
        : pool.reduce((least, candidate) => (candidate.users < least.users ? candidate : least));
    if (!pool.includes(entry)) pool.push(entry);
  } catch {
    return null;
  }
  const shared = entry;
  shared.users += 1;
  let listener: ((response: TerrainWorkerResponse) => void) | null = null;
  let failure: ((error: unknown) => void) | null = null;
  let released = false;
  return {
    post: (request: TerrainWorkerRequest) => shared.worker.postMessage(request),
    listen(onResponse, onFailure) {
      listener = onResponse;
      failure = onFailure;
      shared.listeners.add(onResponse);
      shared.failures.add(onFailure);
      return () => {
        if (listener) shared.listeners.delete(listener);
        if (failure) shared.failures.delete(failure);
      };
    },
    terminate() {
      if (released) return;
      released = true;
      if (listener) shared.listeners.delete(listener);
      if (failure) shared.failures.delete(failure);
      shared.users -= 1;
      if (shared.users <= 0) {
        const index = pool.indexOf(shared);
        if (index >= 0) pool.splice(index, 1);
        shared.worker.terminate();
      }
    },
  };
}

/** Where the pixels of the terrain are made: a worker when the page can have one, the page itself otherwise. */
export function createTerrainPaintBackend(): TerrainPaintBackend {
  return supportsTerrainWorker() ? new TerrainWorkerBackend(openSharedTerrainWorker) : new StudioTerrainPainter();
}
