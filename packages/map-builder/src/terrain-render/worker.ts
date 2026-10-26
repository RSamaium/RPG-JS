/// <reference lib="webworker" />
import type { WorkerRequest, WorkerResponse } from "./backend";
import { TerrainKernelHost } from "./host";

/**
 * Entry of a terrain worker: `new Worker(new URL("@rpgjs/map-builder/terrain-render/worker", import.meta.url), { type: "module" })`.
 * Frames go back as transferables: nothing is copied.
 */
const host = new TerrainKernelHost();
const reply = (message: WorkerResponse, transfer: Transferable[] = []): void => (self as unknown as { postMessage(m: WorkerResponse, t: Transferable[]): void }).postMessage(message, transfer);

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  try {
    if (message.type === "init") {
      host.init(message.init);
      reply({ type: "ready" });
    } else if (message.type === "mask") {
      host.updateMask(message.rect, message.values);
    } else {
      const frame = host.render(message.rect, message.margin);
      reply({ type: "frame", job: message.job, frame }, [frame.pixels.buffer]);
    }
  } catch (error) {
    reply({ type: "error", ...("job" in message ? { job: message.job } : {}), message: error instanceof Error ? error.message : String(error) });
  }
});
