import type { TerrainWaterOverlayData } from "./terrain-chunk-painter";
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
    { resolve: (painted: TerrainWorkerPainted) => void; reject: (error: Error) => void }
  >();

  private constructor(private readonly worker: Worker) {
    worker.onmessage = (event: MessageEvent<TerrainWorkerResponse>) => this.receive(event.data);
    worker.onerror = (event) => this.failAll(new Error(event.message || "terrain worker failed"));
  }

  static create(): TerrainWorkerClient | null {
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

  /** Gives the worker the terrain data the next chunks are painted from. */
  setData(data: StudioTerrainRenderData, collisions: StudioCollisionPolygon[], splitWallForeground: boolean): void {
    const request: TerrainWorkerRequest = { type: "init", data, collisions, splitWallForeground };
    this.worker.postMessage(request);
  }

  paint(bounds: TerrainWorkerBounds): Promise<TerrainWorkerPainted> {
    const requestId = this.nextRequestId++;
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      const request: TerrainWorkerRequest = { type: "paint", requestId, bounds };
      this.worker.postMessage(request);
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
