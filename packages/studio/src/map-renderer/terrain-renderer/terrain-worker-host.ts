import type { ElementLiquidRegion } from "../element-submersion";
import type { StudioTerrainRenderData } from "../types";
import type { TerrainPaintedImage } from "./terrain-canvas";
import type { TerrainPaintBackend } from "./terrain-paint-backend";
import { createTerrainWireReceiver, decodeTerrainData, type TerrainWireReceiver } from "./terrain-wire";
import type {
  TerrainWireChunk,
  TerrainWirePiece,
  TerrainWorkerRequest,
  TerrainWorkerResponse,
} from "./terrain-worker-protocol";

export interface TerrainWorkerReply {
  response: TerrainWorkerResponse;
  /** What the message gives away instead of copying: bitmaps and pixel buffers. */
  transfer: Transferable[];
}

interface HostContext {
  painter: TerrainPaintBackend;
  receiver: TerrainWireReceiver;
  data: StudioTerrainRenderData | null;
  /** The number of the data received last. */
  seq: number;
}

/**
 * The worker's side of the protocol, apart from the worker itself: it takes a request and answers it with a painter, so
 * it can be run, and tested, anywhere. The painter is made for each context (each renderer of the page has its own).
 */
export class TerrainWorkerHost {
  private contexts = new Map<number, HostContext>();

  constructor(
    private readonly createPainter: () => TerrainPaintBackend,
    /** Turns what the painter drew into something that can be sent: in a worker, the canvas becomes a bitmap. */
    private readonly toBitmap: (image: TerrainPaintedImage) => ImageBitmap
  ) {}

  /** Answers a request. A request that has nothing to answer (data, clear) gives `null`. */
  async handle(request: TerrainWorkerRequest): Promise<TerrainWorkerReply | null> {
    if (request.type === "destroy") {
      this.contexts.get(request.context)?.painter.destroy();
      this.contexts.delete(request.context);
      return null;
    }
    const context = this.context(request.context);
    if (request.type === "clear") {
      context.painter.clearCaches();
      return null;
    }
    if (request.type === "data") {
      context.data = decodeTerrainData(context.receiver, request.data);
      context.seq = request.seq;
      context.painter.setData(context.data, request.reset);
      return null;
    }
    const data = context.data;
    const transfer: Transferable[] = [];
    const bitmap = (image: TerrainPaintedImage): ImageBitmap => {
      const result = this.toBitmap(image);
      transfer.push(result);
      return result;
    };
    try {
      if (!data) return { response: { type: "result", id: request.id, value: null }, transfer };
      let value: TerrainWireChunk | TerrainWirePiece[] | ElementLiquidRegion | null = null;
      if (request.type === "chunk") {
        // The data it is for has been replaced while it waited: whoever asked has asked again, there is nothing to draw.
        if (request.seq < context.seq) return { response: { type: "result", id: request.id, value: null }, transfer };
        const paint = await context.painter.paintChunk(request.job);
        value = paint
          ? {
              canvas: bitmap(paint.canvas),
              water: paint.water
                ? {
                    overlayBounds: paint.water.overlayBounds,
                    surface: bitmap(paint.water.surface),
                    regions: paint.water.regions.map((region) => ({ ...region, mask: bitmap(region.mask) })),
                  }
                : null,
            }
          : null;
      } else if (request.type === "wallOcclusion") {
        const pieces = await context.painter.paintWallOcclusion(data, request.sliceWidth);
        value = pieces.map((piece) => ({ ...piece, canvas: bitmap(piece.canvas) }));
      } else if (request.type === "wallShadow") {
        const pieces = await context.painter.paintWallShadow(data, request.style);
        value = pieces.map((piece) => ({ ...piece, canvas: bitmap(piece.canvas) }));
      } else if (request.type === "liquidContact") {
        value = await context.painter.paintLiquidContact(data, request.bounds);
        if (value) transfer.push(value.pixels.buffer as ArrayBuffer, value.contact.buffer as ArrayBuffer);
      }
      return { response: { type: "result", id: request.id, value }, transfer };
    } catch (error) {
      return { response: { type: "error", id: request.id, message: error instanceof Error ? error.message : String(error) }, transfer: [] };
    }
  }

  private context(id: number): HostContext {
    let context = this.contexts.get(id);
    if (!context) {
      context = { painter: this.createPainter(), receiver: createTerrainWireReceiver(), data: null, seq: 0 };
      this.contexts.set(id, context);
    }
    return context;
  }
}
