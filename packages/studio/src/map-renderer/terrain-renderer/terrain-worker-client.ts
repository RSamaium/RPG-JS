import type { StudioTerrainWallShadowStyle, TerrainWallSlice, TerrainWaterOverlayData } from "./terrain-chunk-painter";
import type { StudioCollisionPolygon, StudioTerrainRenderData } from "../types";
import type {
  TerrainWorkerBounds,
  TerrainWorkerRequest,
  TerrainWorkerResponse,
} from "./terrain-worker-protocol";
// @ts-ignore Bundled into the package as an inline worker by Vite.
import TerrainChunkWorker from "./terrain-chunk-render.worker?worker&inline";

export interface TerrainWorkerPainted {
  canvas: HTMLCanvasElement;
  water: TerrainWaterOverlayData | null;
}

const bitmapToCanvas = (bitmap: ImageBitmap): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas;
};

/**
 * Paints terrain chunks in a worker so the heavy pixel work stays off the main thread.
 * `create()` returns `null` where workers or `OffscreenCanvas` are missing; the renderer
 * then paints on the page as before.
 */
export class TerrainWorkerClient {
  private nextRequestId = 1;
  private pending = new Map<
    number,
    { resolve: (result: any) => void; reject: (error: Error) => void }
  >();
  /** A request the worker never answers (an image that hangs) must not hold the map for ever. */
  private static readonly REQUEST_TIMEOUT_MS = 30_000;

  private constructor(private readonly worker: Worker) {
    worker.onmessage = (event: MessageEvent<TerrainWorkerResponse>) => this.receive(event.data);
    worker.onerror = (event) => this.failAll(new Error(event.message || "terrain worker failed"));
  }

  /** Workers started ahead of time: booting one (parsing its code) is off the path of the first map. */
  private static warmed: TerrainWorkerClient[] = [];
  private static warmedTimer: ReturnType<typeof setTimeout> | undefined;
  /** A warmed worker nobody asked for (a map without terrain) is not kept for ever. */
  private static readonly WARM_KEEP_MS = 60_000;

  private static spawn(): TerrainWorkerClient | null {
    if (
      typeof document === "undefined" ||
      typeof Worker === "undefined" ||
      typeof OffscreenCanvas === "undefined" ||
      typeof createImageBitmap === "undefined"
    ) {
      return null;
    }
    try {
      return new TerrainWorkerClient(new TerrainChunkWorker() as Worker);
    } catch {
      return null;
    }
  }

  /**
   * Starts workers now so they are booted when the first map needs them. Safe to call again and
   * where workers are not available.
   *
   * @param count - Workers kept ready (the terrain and its walls use one each)
   */
  static warm(count = 2): void {
    while (TerrainWorkerClient.warmed.length < count) {
      const worker = TerrainWorkerClient.spawn();
      if (!worker) return;
      TerrainWorkerClient.warmed.push(worker);
    }
    clearTimeout(TerrainWorkerClient.warmedTimer);
    TerrainWorkerClient.warmedTimer = setTimeout(() => {
      TerrainWorkerClient.warmed.splice(0).forEach((worker) => worker.dispose());
    }, TerrainWorkerClient.WARM_KEEP_MS);
  }

  static create(): TerrainWorkerClient | null {
    return TerrainWorkerClient.warmed.pop() ?? TerrainWorkerClient.spawn();
  }

  /** Gives the worker the terrain data the next chunks are painted from. */
  setData(data: StudioTerrainRenderData, collisions: StudioCollisionPolygon[], splitWallForeground: boolean): void {
    const request: TerrainWorkerRequest = { type: "init", data, collisions, splitWallForeground };
    this.worker.postMessage(request);
  }

  paint(bounds: TerrainWorkerBounds): Promise<TerrainWorkerPainted> {
    const requestId = this.nextRequestId++;
    return new Promise((resolve, reject) => {
      this.track(requestId, resolve, reject);
      const request: TerrainWorkerRequest = { type: "paint", requestId, bounds };
      this.worker.postMessage(request);
    });
  }

  /** Paints the wall occlusion or the wall shadow slices of a terrain. */
  paintWalls(
    data: StudioTerrainRenderData,
    request:
      | { type: "walls-occlusion"; sliceWidth: number }
      | { type: "walls-shadow"; style: StudioTerrainWallShadowStyle }
  ): Promise<TerrainWallSlice[]> {
    const requestId = this.nextRequestId++;
    return new Promise((resolve, reject) => {
      this.track(requestId, resolve, reject);
      this.worker.postMessage({ ...request, requestId, data } as TerrainWorkerRequest);
    });
  }

  private track(
    requestId: number,
    resolve: (result: any) => void,
    reject: (error: Error) => void
  ): void {
    const timer = setTimeout(() => {
      if (this.pending.delete(requestId)) reject(new Error("terrain worker request timed out"));
    }, TerrainWorkerClient.REQUEST_TIMEOUT_MS);
    this.pending.set(requestId, {
      resolve: (result) => { clearTimeout(timer); resolve(result); },
      reject: (error) => { clearTimeout(timer); reject(error); },
    });
  }

  dispose(): void {
    this.worker.terminate();
    this.failAll(new Error("terrain worker disposed"));
  }

  private receive(message: TerrainWorkerResponse): void {
    const request = this.pending.get(message.requestId);
    if (!request) return;
    this.pending.delete(message.requestId);
    if (message.type === "error") {
      request.reject(new Error(message.message));
      return;
    }
    if (message.type === "walls") {
      request.resolve(
        message.slices.map(({ bitmap, ...slice }) => ({ ...slice, canvas: bitmapToCanvas(bitmap) }))
      );
      return;
    }
    const water = message.water
      ? {
          overlayBounds: message.water.overlayBounds,
          surface: bitmapToCanvas(message.water.surface),
          regions: message.water.regions.map(({ mask, ...region }) => ({
            ...region,
            mask: bitmapToCanvas(mask),
          })),
        }
      : null;
    const canvas = bitmapToCanvas(message.bitmap);
    request.resolve({ canvas, water });
  }

  private failAll(error: Error): void {
    for (const request of this.pending.values()) request.reject(error);
    this.pending.clear();
  }
}
