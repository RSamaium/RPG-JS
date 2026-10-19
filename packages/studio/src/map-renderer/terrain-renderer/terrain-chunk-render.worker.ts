/// <reference lib="webworker" />
import { StudioTerrainChunkPainter, type TerrainWaterOverlayData } from "./terrain-chunk-painter";
import type { StudioCollisionPolygon, StudioTerrainRenderData } from "../types";
import type {
  TerrainWorkerRequest,
  TerrainWorkerResponse,
  TerrainWorkerWater,
} from "./terrain-worker-protocol";

/**
 * Paints terrain chunks off the main thread: the same painting code as the page,
 * run on `OffscreenCanvas`. Only the finished bitmaps go back.
 */
const scope = self as unknown as DedicatedWorkerGlobalScope;
const renderer = new StudioTerrainChunkPainter();
const images = new Map<string, Promise<ImageBitmap | null>>();

let data: StudioTerrainRenderData | null = null; // replaced by "init"
let collisions: StudioCollisionPolygon[] = [];
let splitWallForeground = false;

const loadImage = (source: string | undefined | null): Promise<ImageBitmap | null> => {
  if (!source) return Promise.resolve(null);
  let pending = images.get(source);
  if (!pending) {
    pending = fetch(source, { mode: "cors" })
      .then((response) => (response.ok ? response.blob() : Promise.reject(new Error(String(response.status)))))
      .then((blob) => createImageBitmap(blob))
      .then((bitmap) => {
        // The painting code reads the size of an image like an HTMLImageElement's.
        Object.defineProperty(bitmap, "naturalWidth", { value: bitmap.width });
        Object.defineProperty(bitmap, "naturalHeight", { value: bitmap.height });
        return bitmap;
      })
      .catch(() => null);
    images.set(source, pending);
  }
  return pending;
};

const toBitmap = (canvas: HTMLCanvasElement): Promise<ImageBitmap> =>
  createImageBitmap(canvas as unknown as OffscreenCanvas);

const packWater = async (
  water: TerrainWaterOverlayData
): Promise<{ water: TerrainWorkerWater; transfer: ImageBitmap[] }> => {
  const surface = await toBitmap(water.surface);
  const regions = await Promise.all(
    water.regions.map(async ({ mask, ...region }) => ({ ...region, mask: await toBitmap(mask) }))
  );
  return {
    water: { overlayBounds: water.overlayBounds, surface, regions },
    transfer: [surface, ...regions.map((region) => region.mask)],
  };
};

const reply = (message: TerrainWorkerResponse, transfer: Transferable[] = []) =>
  scope.postMessage(message, transfer);

scope.onmessage = async (event: MessageEvent<TerrainWorkerRequest>) => {
  const message = event.data;
  if (message.type === "init") {
    data = message.data;
    collisions = message.collisions;
    splitWallForeground = message.splitWallForeground;
    renderer.resetRenderCaches();
    return;
  }
  if (message.type === "walls-occlusion" || message.type === "walls-shadow") {
    try {
      // Walls are made from their own data and caches, like the page does for them.
      const walls = new StudioTerrainChunkPainter();
      let slices;
      if (message.type === "walls-occlusion") {
        const image = await loadImage(message.data.sourceTexture);
        slices = walls.paintWallOcclusionSlices(
          message.data,
          image as unknown as HTMLImageElement | null,
          message.sliceWidth
        );
      } else {
        slices = walls.paintWallShadowSlices(message.data, message.style);
      }
      const packed = await Promise.all(
        slices.map(async ({ canvas, ...slice }) => ({ ...slice, bitmap: await toBitmap(canvas) }))
      );
      reply({ type: "walls", requestId: message.requestId, slices: packed }, packed.map((slice) => slice.bitmap));
    } catch (error) {
      reply({
        type: "error",
        requestId: message.requestId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }
  if (message.type !== "paint") return;
  try {
    const current = data;
    if (!current) throw new Error("terrain data missing");
    const [image, controlImage] = await Promise.all([
      loadImage(current.sourceTexture),
      current.terrainControl?.source && !current.terrainControl.regions?.length
        ? loadImage(current.terrainControl.source)
        : Promise.resolve(null),
    ]);
    const painted = renderer.paintChunkLayers(
      current,
      image as unknown as HTMLImageElement | null,
      controlImage as unknown as HTMLImageElement | null,
      message.bounds,
      collisions,
      splitWallForeground
    );
    if (!painted) throw new Error("canvas unavailable");
    const bitmap = await toBitmap(painted.canvas);
    const packed = painted.water ? await packWater(painted.water) : null;
    reply(
      { type: "painted", requestId: message.requestId, bitmap, ...(packed ? { water: packed.water } : {}) },
      [bitmap, ...(packed?.transfer ?? [])]
    );
  } catch (error) {
    reply({
      type: "error",
      requestId: message.requestId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
