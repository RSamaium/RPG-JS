import { afterEach, describe, expect, it, vi } from "vitest";
import type { TerrainPaintBackend } from "./terrain-paint-backend";
import { TerrainWorkerHost } from "./terrain-worker-host";
import { TerrainWorkerBackend, type TerrainWorkerTransport } from "./terrain-worker-backend";
import type { TerrainWorkerRequest, TerrainWorkerResponse } from "./terrain-worker-protocol";

const rawData = (version = "v1") => ({ widthTiles: 1, heightTiles: 1, tileSize: 48, width: 48, height: 48, asset: null, sourceTexture: "", terrainControl: null, terrainGrid: [], morphologyFeatures: [], waterAnimation: { enabled: false }, version }) as never;
const job = (key = "0:0") => ({ key, bounds: { x: 0, y: 0, width: 48, height: 48 }, collisions: [], splitWallForeground: false, clip: null });

/** A worker in the same thread: what the page posts goes to a host that answers asynchronously. */
function loopback(options: { fail?: () => unknown } = {}) {
  const painter = {
    setData: vi.fn(),
    paintChunk: vi.fn(async (j: { key: string }) => ({ canvas: `drawn:${j.key}` as never, water: null })),
    paintWallOcclusion: vi.fn(async () => []),
    paintWallShadow: vi.fn(async () => []),
    paintLiquidContact: vi.fn(async () => null),
    clearCaches: vi.fn(),
    destroy: vi.fn(),
  } satisfies TerrainPaintBackend;
  const host = new TerrainWorkerHost(() => painter, (image) => ({ bitmap: image }) as unknown as ImageBitmap);
  const posted: TerrainWorkerRequest[] = [];
  let listener: ((response: TerrainWorkerResponse) => void) | null = null;
  let onFailure: ((error: unknown) => void) | null = null;
  const transport: TerrainWorkerTransport = {
    post(request) {
      const error = options.fail?.();
      if (error) throw error;
      posted.push(request);
      void host.handle(request).then((reply) => reply && listener?.(reply.response));
    },
    listen(onResponse, failure) {
      listener = onResponse;
      onFailure = failure;
      return () => (listener = null);
    },
    terminate: vi.fn(),
  };
  return { transport, painter, posted, crash: (error: unknown) => onFailure?.(error) };
}

describe("the terrain backend that draws in a worker", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends the data first, then asks for the chunk, and gives back what the worker drew", async () => {
    const { transport, posted, painter } = loopback();
    const backend = new TerrainWorkerBackend(async () => transport);
    backend.setData(rawData(), true);

    const paint = await backend.paintChunk(job("1:0"));

    expect(posted.map((request) => request.type)).toEqual(["data", "chunk"]);
    expect(painter.setData).toHaveBeenCalledWith(expect.objectContaining({ width: 48 }), true);
    expect(paint).toMatchObject({ canvas: { bitmap: "drawn:1:0" }, water: null });
  });

  it("sends the same data once: asking again, or setting the data it has, says nothing", async () => {
    const { transport, posted } = loopback();
    const backend = new TerrainWorkerBackend(async () => transport);
    const data = rawData();
    backend.setData(data, false);
    await backend.paintChunk(job("0:0"));
    backend.setData(data, false);
    await backend.paintChunk(job("1:0"));

    expect(posted.map((request) => request.type)).toEqual(["data", "chunk", "chunk"]);
  });

  it("numbers the data, so that a chunk is for the data it was asked with", async () => {
    const { transport, posted } = loopback();
    const backend = new TerrainWorkerBackend(async () => transport);
    backend.setData(rawData("v1"), false);
    const first = backend.paintChunk(job());
    backend.setData(rawData("v2"), false);
    const second = backend.paintChunk(job());
    await Promise.all([first, second]);

    const chunks = posted.filter((request) => request.type === "chunk");
    expect(chunks.map((request) => (request as { seq: number }).seq)).toEqual([1, 2]);
    // the first was for data that was replaced: the worker did not draw it
    await expect(first).resolves.toBeNull();
    await expect(second).resolves.toMatchObject({ canvas: { bitmap: "drawn:0:0" } });
  });

  it("draws in the page when there is no worker", async () => {
    const backend = new TerrainWorkerBackend(async () => null);
    backend.setData(rawData(), false);
    await expect(backend.paintChunk(job())).resolves.toMatchObject({ canvas: expect.anything(), water: null });
  });

  it("draws in the page from then on when the worker cannot take a message", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { transport, posted } = loopback({ fail: () => new Error("DataCloneError") });
    const backend = new TerrainWorkerBackend(async () => transport);
    backend.setData(rawData(), false);

    await expect(backend.paintChunk(job())).resolves.toMatchObject({ canvas: expect.anything() });

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("terrain worker failed"), expect.any(Error));
    expect(transport.terminate).toHaveBeenCalled();
    expect(posted).toHaveLength(0);
    // and it does not try the worker again
    await backend.paintChunk(job("1:0"));
    expect(posted).toHaveLength(0);
  });

  it("draws in the page what the worker was asked and did not answer, when it goes down", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { transport, crash } = loopback();
    transport.post = () => undefined; // the worker never answers
    const backend = new TerrainWorkerBackend(async () => transport);
    backend.setData(rawData(), false);

    const waiting = backend.paintChunk(job());
    await new Promise((resolve) => setTimeout(resolve, 0)); // the request is out
    crash(new Error("worker crashed"));

    await expect(waiting).resolves.toMatchObject({ canvas: expect.anything() }); // the page drew it
    expect(transport.terminate).toHaveBeenCalled();
  });

  it("asks the worker for the walls with the data it is given, sending it when it is not the one the worker has", async () => {
    const { transport, posted, painter } = loopback();
    const backend = new TerrainWorkerBackend(async () => transport);
    const data = rawData();

    await backend.paintWallOcclusion(data, 24);
    await backend.paintWallShadow(data, { offsetX: 1, offsetY: 1, blur: 1, alpha: 1, color: "#000" });

    expect(posted.map((request) => request.type)).toEqual(["data", "wallOcclusion", "wallShadow"]);
    expect(painter.paintWallOcclusion).toHaveBeenCalledWith(expect.objectContaining({ width: 48 }), 24);
  });

  it("lets go of the worker, and answers nothing once it is destroyed", async () => {
    const { transport, posted } = loopback();
    const backend = new TerrainWorkerBackend(async () => transport);
    backend.setData(rawData(), false);
    await backend.paintChunk(job());
    backend.destroy();

    expect(posted.at(-1)).toMatchObject({ type: "destroy" });
    expect(transport.terminate).toHaveBeenCalled();
    await expect(backend.paintChunk(job())).resolves.toBeNull();
  });
});
