import type { TerrainRenderInit } from "../terrain/kernel";
import type { TerrainFrame, WorldRect } from "../terrain/scheduler";
import type { MaskRect } from "../terrain/types";
import { TerrainKernelHost } from "./host";

/**
 * Where the kernel runs. The terrain feature only talks to this, so the same feature works in the
 * main thread (small maps, tests), in a pool of workers (live painting) or anywhere else.
 */
export interface TerrainBackend {
  /** How many renders it can run at once. */
  readonly concurrency: number;
  /** Gives the terrain to render. Called again when the palette or the morphology changes. */
  init(init: TerrainRenderInit): Promise<void>;
  /** Material values over a rectangle of the mask, in the order the patches were applied. */
  updateMask(rect: MaskRect, values: Uint16Array): void;
  render(rect: WorldRect, margin?: number): Promise<TerrainFrame>;
  destroy(): void;
}

/** The kernel on the calling thread. A 512 px chunk takes a few hundred milliseconds: fine for tests and small maps. */
export function inlineTerrainBackend(): TerrainBackend {
  const host = new TerrainKernelHost();
  return {
    concurrency: 1,
    init: async (init) => host.init(init),
    updateMask: (rect, values) => host.updateMask(rect, values),
    render: async (rect, margin) => host.render(rect, margin),
    destroy: () => host.destroy(),
  };
}

/** What travels to a worker and back. */
export type WorkerRequest =
  | { readonly type: "init"; readonly init: TerrainRenderInit }
  | { readonly type: "mask"; readonly rect: MaskRect; readonly values: Uint16Array }
  | { readonly type: "render"; readonly job: number; readonly rect: WorldRect; readonly margin?: number };

export type WorkerResponse =
  | { readonly type: "ready" }
  | { readonly type: "frame"; readonly job: number; readonly frame: TerrainFrame }
  | { readonly type: "error"; readonly job?: number; readonly message: string };

export interface WorkerLike {
  postMessage(message: WorkerRequest, transfer?: Transferable[]): void;
  addEventListener(type: "message", listener: (event: { data: WorkerResponse }) => void): void;
  addEventListener(type: "error", listener: (event: { message?: string }) => void): void;
  terminate(): void;
}

export interface WorkerBackendOptions {
  /** Creates one worker that runs `@rpgjs/map-builder/terrain-render/worker`. */
  readonly createWorker: () => WorkerLike;
  /** Number of workers. Defaults to the number of cores minus one, at most 4. */
  readonly workers?: number;
}

/**
 * The kernel in a pool of workers: the main thread only sends patches and receives frames, and stays
 * free while a stroke is painted. Every worker keeps its own copy of the mask and receives every change.
 */
export function workerTerrainBackend(options: WorkerBackendOptions): TerrainBackend {
  const count = Math.max(1, options.workers ?? Math.min(4, Math.max(1, ((globalThis as { navigator?: { hardwareConcurrency?: number } }).navigator?.hardwareConcurrency ?? 4) - 1)));
  const workers: WorkerLike[] = [];
  const waiting = new Map<number, { resolve: (frame: TerrainFrame) => void; reject: (error: Error) => void }>();
  let ready: Array<() => void> = [];
  let jobs = 0;
  let next = 0;

  const start = (): void => {
    if (workers.length > 0) return;
    for (let i = 0; i < count; i += 1) {
      const worker = options.createWorker();
      worker.addEventListener("message", ({ data }) => {
        if (data.type === "ready") ready.splice(0, 1)[0]?.();
        else if (data.type === "frame") {
          waiting.get(data.job)?.resolve(data.frame);
          waiting.delete(data.job);
        } else if (data.type === "error" && data.job !== undefined) {
          waiting.get(data.job)?.reject(new Error(data.message));
          waiting.delete(data.job);
        }
      });
      worker.addEventListener("error", (event) => {
        for (const [job, pending] of waiting) {
          pending.reject(new Error(event.message ?? "terrain worker failed"));
          waiting.delete(job);
        }
      });
      workers.push(worker);
    }
  };

  return {
    concurrency: count,
    init(init) {
      start();
      return Promise.all(
        workers.map((worker) => new Promise<void>((resolve) => {
          ready.push(resolve);
          worker.postMessage({ type: "init", init });
        })),
      ).then(() => undefined);
    },
    updateMask(rect, values) {
      // Each worker gets its own copy: the buffer is not transferred.
      for (const worker of workers) worker.postMessage({ type: "mask", rect, values: values.slice() });
    },
    render(rect, margin) {
      const job = (jobs += 1);
      const worker = workers[next++ % workers.length];
      if (!worker) return Promise.reject(new Error("terrain backend: not initialised"));
      return new Promise<TerrainFrame>((resolve, reject) => {
        waiting.set(job, { resolve, reject });
        worker.postMessage({ type: "render", job, rect, ...(margin !== undefined ? { margin } : {}) });
      });
    },
    destroy() {
      for (const worker of workers) worker.terminate();
      workers.length = 0;
      for (const pending of waiting.values()) pending.reject(new Error("terrain backend: destroyed"));
      waiting.clear();
      ready = [];
    },
  };
}
