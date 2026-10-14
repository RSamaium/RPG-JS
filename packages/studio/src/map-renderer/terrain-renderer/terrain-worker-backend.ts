import type { ElementLiquidRegion } from "../element-submersion";
import type { StudioTerrainRenderBounds, StudioTerrainRenderData } from "../types";
import type {
  TerrainChunkJob,
  TerrainChunkPaint,
  TerrainPaintBackend,
  TerrainWallOcclusionPiece,
  TerrainWallShadowPiece,
} from "./terrain-paint-backend";
import { StudioTerrainPainter, type StudioTerrainWallShadowStyle } from "./terrain-painter";
import { createTerrainWireSender, encodeTerrainData } from "./terrain-wire";
import type { TerrainWireChunk, TerrainWirePiece, TerrainWorkerRequest, TerrainWorkerResponse } from "./terrain-worker-protocol";

/** The way to a worker: what can be sent to it, and what it answers. */
export interface TerrainWorkerTransport {
  post(request: TerrainWorkerRequest): void;
  /** Called with each answer. Returns what stops listening. */
  listen(listener: (response: TerrainWorkerResponse) => void, onFailure: (error: unknown) => void): () => void;
  terminate(): void;
}

/** Whether the page can draw the terrain in a worker: it needs canvases and bitmaps that a worker can have. */
export function supportsTerrainWorker(): boolean {
  return typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined" && typeof createImageBitmap !== "undefined";
}

let nextContext = 1;
/** Requests have one numbering for all the backends: they can share a worker, and the answers say only which request they are for. */
let nextRequest = 1;

/**
 * Draws the terrain in a worker, and in the page when there is none (or when it fails): the same painter either way. The
 * page asks, the worker answers with bitmaps; nothing of the pixel work runs in the page.
 */
export class TerrainWorkerBackend implements TerrainPaintBackend {
  private readonly context = nextContext++;
  private readonly sender = createTerrainWireSender();
  private readonly pending = new Map<number, { resolve: (value: any) => void; reject: (error: unknown) => void }>();
  private transport: TerrainWorkerTransport | null = null;
  private stopListening: (() => void) | null = null;
  private fallback: StudioTerrainPainter | null = null;
  private opening: Promise<void> | null = null;
  /** What was sent before the worker was there. */
  private queued: TerrainWorkerRequest[] = [];
  private lastData: StudioTerrainRenderData | null = null;
  private lastReset = false;
  /** The number of the data sent last: a chunk is asked for the data it was asked with. */
  private seq = 0;
  private destroyed = false;

  constructor(private readonly openTransport: () => Promise<TerrainWorkerTransport | null>) {}

  setData(data: StudioTerrainRenderData, reset: boolean): void {
    if (this.destroyed) return;
    // The data the worker has already, and nothing to forget: nothing to say.
    if (data === this.lastData && !reset) return;
    this.lastData = data;
    this.lastReset = reset;
    if (this.fallback) {
      this.fallback.setData(data, reset);
      return;
    }
    this.post({ type: "data", context: this.context, data: encodeTerrainData(this.sender, data), reset, seq: ++this.seq });
  }

  paintChunk(job: TerrainChunkJob): Promise<TerrainChunkPaint | null> {
    // The number of the data it is asked for now: the request goes out later, when the worker is there.
    const seq = this.seq;
    return this.ask(
      (id) => ({ type: "chunk", context: this.context, id, seq, job }),
      (painter) => painter.paintChunk(job),
      (value: TerrainWireChunk | null) => value
    );
  }

  paintWallOcclusion(data: StudioTerrainRenderData, sliceWidth: number): Promise<TerrainWallOcclusionPiece[]> {
    this.useData(data);
    return this.ask(
      (id) => ({ type: "wallOcclusion", context: this.context, id, sliceWidth }),
      (painter) => painter.paintWallOcclusion(data, sliceWidth),
      (value: TerrainWirePiece[] | null) => (value ?? []) as TerrainWallOcclusionPiece[]
    );
  }

  paintWallShadow(data: StudioTerrainRenderData, style: StudioTerrainWallShadowStyle): Promise<TerrainWallShadowPiece[]> {
    this.useData(data);
    return this.ask(
      (id) => ({ type: "wallShadow", context: this.context, id, style }),
      (painter) => painter.paintWallShadow(data, style),
      (value: TerrainWirePiece[] | null) => (value ?? []) as TerrainWallShadowPiece[]
    );
  }

  paintLiquidContact(data: StudioTerrainRenderData, bounds: StudioTerrainRenderBounds): Promise<ElementLiquidRegion | null> {
    this.useData(data);
    return this.ask(
      (id) => ({ type: "liquidContact", context: this.context, id, bounds }),
      (painter) => painter.paintLiquidContact(data, bounds),
      (value: ElementLiquidRegion | null) => value
    );
  }

  clearCaches(): void {
    this.post({ type: "clear", context: this.context });
    this.fallback?.clearCaches();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.post({ type: "destroy", context: this.context });
    this.queued = [];
    this.release();
    this.fallback?.destroy();
    this.fallback = null;
    this.lastData = null;
    for (const request of this.pending.values()) request.resolve(null);
    this.pending.clear();
  }

  /** The data a request is about: sent when it is not the one the worker has. */
  private useData(data: StudioTerrainRenderData): void {
    if (data !== this.lastData) this.setData(data, false);
  }

  /** Sends a request, or keeps it until the worker is there. Nothing is sent once the page draws by itself. */
  private post(request: TerrainWorkerRequest): void {
    if (this.fallback) return;
    if (this.transport) {
      this.send(this.transport, request);
      return;
    }
    this.queued.push(request);
    void this.open();
  }

  private open(): Promise<void> {
    const opening = (this.opening ??= this.openTransport().then(
      (transport) => {
        if (this.destroyed) {
          transport?.terminate();
          return;
        }
        if (!transport) {
          this.useFallback();
          return;
        }
        this.transport = transport;
        this.stopListening = transport.listen(
          (response) => {
            const request = this.pending.get(response.id);
            if (!request) return;
            this.pending.delete(response.id);
            if (response.type === "error") request.reject(new Error(response.message));
            else request.resolve(response.value);
          },
          (error) => this.fail(error)
        );
        for (const request of this.queued.splice(0)) this.send(transport, request);
      },
      (error) => this.fail(error)
    ));
    return opening;
  }

  private async ask<W, R>(
    build: (id: number) => TerrainWorkerRequest,
    inPage: (painter: StudioTerrainPainter) => Promise<R>,
    fromWire: (value: W | null) => R
  ): Promise<R> {
    if (this.destroyed) return fromWire(null);
    await this.open();
    if (this.destroyed) return fromWire(null);
    const transport = this.transport;
    if (!transport || this.fallback) return inPage(this.fallback ?? this.useFallback());
    const id = nextRequest++;
    try {
      const value = await new Promise<W | null>((resolve, reject) => {
        this.pending.set(id, { resolve, reject });
        this.send(transport, build(id), reject);
      });
      return fromWire(value);
    } catch (error) {
      // The worker could not draw it: the page does, and does from now on.
      this.fail(error);
      return this.destroyed ? fromWire(null) : inPage(this.fallback ?? this.useFallback());
    }
  }

  /** Sends a request to the worker. What cannot be sent (data that cannot be cloned) is a failure of the worker. */
  private send(transport: TerrainWorkerTransport, request: TerrainWorkerRequest, reject?: (error: unknown) => void): void {
    try {
      transport.post(request);
    } catch (error) {
      if (reject) reject(error);
      else this.fail(error);
    }
  }

  /** The page draws by itself, from the data the worker was given. */
  private useFallback(): StudioTerrainPainter {
    this.release();
    this.queued = [];
    this.fallback ??= new StudioTerrainPainter();
    if (this.lastData) this.fallback.setData(this.lastData, this.lastReset);
    return this.fallback;
  }

  /** The worker is out: a painter of the page takes over, and the requests that were waiting ask it. */
  private fail(error: unknown): void {
    if (this.fallback || this.destroyed) return;
    console.warn("[studio] terrain worker failed, drawing the terrain in the page", error);
    this.useFallback();
    const pending = [...this.pending.values()];
    this.pending.clear();
    for (const request of pending) request.reject(error);
  }

  private release(): void {
    this.stopListening?.();
    this.stopListening = null;
    this.transport?.terminate();
    this.transport = null;
  }
}
