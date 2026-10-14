import { describe, expect, it, vi } from "vitest";
import type { TerrainPaintBackend } from "./terrain-paint-backend";
import { createTerrainWireSender, encodeTerrainData } from "./terrain-wire";
import { TerrainWorkerHost } from "./terrain-worker-host";

const rawData = { widthTiles: 1, heightTiles: 1, tileSize: 48, width: 48, height: 48, asset: null, sourceTexture: "", terrainControl: null, terrainGrid: [], morphologyFeatures: [], waterAnimation: { enabled: false }, version: "v1" } as never;
const job = { key: "0:0", bounds: { x: 0, y: 0, width: 48, height: 48 }, collisions: [], splitWallForeground: false, clip: null };
const bitmapOf = (image: unknown) => ({ bitmap: image }) as unknown as ImageBitmap;

const setup = () => {
  const painter = {
    setData: vi.fn(),
    paintChunk: vi.fn(async () => ({ canvas: "chunk" as never, water: null })),
    paintWallOcclusion: vi.fn(async () => [{ canvas: "slice" as never, x: 1, y: 2, zIndex: 3, label: "slice" }]),
    paintWallShadow: vi.fn(async () => [{ canvas: "shadow" as never, x: 4, y: 5, label: "shadow" }]),
    paintLiquidContact: vi.fn(async () => ({ width: 1, height: 1, pixels: new Uint8ClampedArray(4), contact: new Uint8ClampedArray(4) })),
    clearCaches: vi.fn(),
    destroy: vi.fn(),
  } satisfies TerrainPaintBackend;
  const host = new TerrainWorkerHost(() => painter, bitmapOf);
  const sender = createTerrainWireSender();
  const data = (seq: number, reset = false) => host.handle({ type: "data", context: 1, data: encodeTerrainData(sender, rawData), reset, seq });
  return { host, painter, data };
};

describe("the worker's side of the terrain protocol", () => {
  it("draws a chunk from the data it was given, and answers with bitmaps it gives away", async () => {
    const { host, painter, data } = setup();
    await data(1, true);
    expect(painter.setData).toHaveBeenCalledWith(expect.objectContaining({ width: 48 }), true);

    const reply = await host.handle({ type: "chunk", context: 1, id: 7, seq: 1, job });
    expect(painter.paintChunk).toHaveBeenCalledWith(job);
    expect(reply!.response).toEqual({ type: "result", id: 7, value: { canvas: { bitmap: "chunk" }, water: null } });
    expect(reply!.transfer).toHaveLength(1);
  });

  it("does not draw a chunk for data that another has replaced while it waited", async () => {
    const { host, painter, data } = setup();
    await data(1);
    await data(2);
    const reply = await host.handle({ type: "chunk", context: 1, id: 1, seq: 1, job });
    expect(reply!.response).toEqual({ type: "result", id: 1, value: null });
    expect(painter.paintChunk).not.toHaveBeenCalled();
  });

  it("answers nothing before it has data", async () => {
    const { host } = setup();
    const reply = await host.handle({ type: "chunk", context: 1, id: 1, seq: 0, job });
    expect(reply!.response).toEqual({ type: "result", id: 1, value: null });
  });

  it("gives the pieces of the walls and the pixels of a liquid, with what can be given away", async () => {
    const { host, data } = setup();
    await data(1);
    const occlusion = await host.handle({ type: "wallOcclusion", context: 1, id: 1, sliceWidth: 24 });
    expect(occlusion!.response).toMatchObject({ value: [{ canvas: { bitmap: "slice" }, x: 1, y: 2, zIndex: 3, label: "slice" }] });
    const shadow = await host.handle({ type: "wallShadow", context: 1, id: 2, style: { offsetX: 0, offsetY: 0, blur: 1, alpha: 1, color: "#000" } });
    expect(shadow!.response).toMatchObject({ value: [{ canvas: { bitmap: "shadow" }, x: 4, y: 5 }] });
    const liquid = await host.handle({ type: "liquidContact", context: 1, id: 3, bounds: { x: 0, y: 0, width: 1, height: 1 } });
    expect(liquid!.transfer).toHaveLength(2);
  });

  it("keeps the renderers apart: each context has its own painter and data", async () => {
    const { host, painter, data } = setup();
    await data(1);
    const reply = await host.handle({ type: "chunk", context: 2, id: 1, seq: 1, job });
    expect(reply!.response).toEqual({ type: "result", id: 1, value: null }); // the other context has no data
    expect(painter.paintChunk).not.toHaveBeenCalled();
  });

  it("clears, and forgets a context that is destroyed", async () => {
    const { host, painter, data } = setup();
    await data(1);
    await host.handle({ type: "clear", context: 1 });
    expect(painter.clearCaches).toHaveBeenCalled();
    await host.handle({ type: "destroy", context: 1 });
    expect(painter.destroy).toHaveBeenCalled();
    const reply = await host.handle({ type: "chunk", context: 1, id: 1, seq: 1, job });
    expect(reply!.response).toEqual({ type: "result", id: 1, value: null });
  });

  it("answers an error, not a silence, when the painter fails", async () => {
    const { host, painter, data } = setup();
    await data(1);
    painter.paintChunk.mockRejectedValueOnce(new Error("no canvas"));
    const reply = await host.handle({ type: "chunk", context: 1, id: 9, seq: 1, job });
    expect(reply!.response).toEqual({ type: "error", id: 9, message: "no canvas" });
  });
});
