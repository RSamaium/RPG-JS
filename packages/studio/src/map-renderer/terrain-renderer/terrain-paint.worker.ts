import { loadTerrainImageBitmap, type TerrainPaintedImage } from "./terrain-canvas";
import { StudioTerrainPainter } from "./terrain-painter";
import { TerrainWorkerHost } from "./terrain-worker-host";
import type { TerrainWorkerRequest, TerrainWorkerResponse } from "./terrain-worker-protocol";

/**
 * Entry of the worker that draws the terrain: the painter of the page, run on `OffscreenCanvas`, so that the pixels are the
 * same and the page keeps answering while they are made.
 */
const host = new TerrainWorkerHost(
  () => new StudioTerrainPainter(loadTerrainImageBitmap),
  (image: TerrainPaintedImage) => (image instanceof ImageBitmap ? image : (image as OffscreenCanvas).transferToImageBitmap())
);

const scope = self as unknown as {
  addEventListener(type: "message", listener: (event: MessageEvent<TerrainWorkerRequest>) => void): void;
  postMessage(message: TerrainWorkerResponse, transfer: Transferable[]): void;
};

// The data goes in as it arrives, so that a chunk that waits for its turn can see it has been replaced. What is drawn goes one
// after the other: a worker draws one thing at a time.
let queue: Promise<unknown> = Promise.resolve();
scope.addEventListener("message", (event) => {
  const request = event.data;
  const run = async (): Promise<void> => {
    const reply = await host.handle(request);
    if (reply) scope.postMessage(reply.response, reply.transfer);
  };
  if (request.type === "data" || request.type === "clear" || request.type === "destroy") void run();
  else queue = queue.then(run);
});
