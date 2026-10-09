import { Context, inject, injector } from "@signe/di";
import { MAP_STREAM_EVENT, MAP_STREAM_REQUEST_EVENT, UpdateMapToken } from "@rpgjs/common";
import { describe, expect, it, vi } from "vitest";
import type { MapStreamChunk, MapStreamManifest } from "@rpgjs/common";
import { LoadMapToken } from "./loadMap";
import { WebSocketToken } from "./AbstractSocket";
import { MapStreamClientController, provideClientMapStreaming } from "./mapStreaming";

type State = { keys: Set<string> };

function manifest(revision: string): MapStreamManifest<Record<string, never>> {
  return {
    protocol: 1,
    mapId: "demo",
    revision,
    width: 200,
    height: 100,
    chunkWidth: 100,
    chunkHeight: 100,
    columns: 2,
    rows: 1,
    renderData: {},
  };
}

function chunk(key: string, x: number): MapStreamChunk<{ tile: number }> {
  return {
    key,
    x,
    y: 0,
    bounds: { x: x * 100, y: 0, width: 100, height: 100 },
    renderData: { tile: x + 1 },
    hitboxes: [{ id: `wall-${key}`, x: x * 100, y: 0, width: 10, height: 10 }],
  };
}

async function createStreamingLoader(socket: unknown, timeoutMs?: number) {
  const context = new Context();
  const update = vi.fn();
  await injector(context, [
    { provide: WebSocketToken, useValue: socket },
    { provide: UpdateMapToken, useValue: { update } },
    ...provideClientMapStreaming({
      adapter: {
        component: {},
        createState: () => ({ keys: new Set<string>() }),
        applyChunk: (state: State, value) => state.keys.add(value.key),
        removeChunk: (state: State, key) => state.keys.delete(key),
        getData: (state: State) => [...state.keys],
      },
      timeoutMs,
    }),
  ]);
  return {
    loader: inject<{ load(mapId: string): Promise<any> }>(context, LoadMapToken),
    update,
  };
}

describe("MapStreamClientController", () => {
  it("keeps the active map attached when a new map revision arrives", () => {
    const controller = new MapStreamClientController<Record<string, never>, { tile: number }, State>({
      component: {},
      createState: () => ({ keys: new Set() }),
      applyChunk: (state, value) => state.keys.add(value.key),
      removeChunk: (state, key) => state.keys.delete(key),
      getData: (state) => [...state.keys],
    }, manifest("one"));
    controller.receive({
      mapId: "demo",
      revision: "one",
      manifest: manifest("one"),
      chunks: [chunk("0:0", 0)],
      removed: [],
    });

    let current = controller.toMapData();
    const data = Object.assign(() => current, {
      set: vi.fn((value) => { current = value; }),
    });
    const map = {
      data,
      replaceStreamedStaticHitboxes: vi.fn(),
      clearStreamedStaticHitboxes: vi.fn(),
    };
    controller.attach(map);

    controller.reset(manifest("two"));
    controller.receive({
      mapId: "demo",
      revision: "two",
      manifest: manifest("two"),
      chunks: [chunk("1:0", 1)],
      removed: [],
    });

    expect(map.clearStreamedStaticHitboxes).toHaveBeenCalledWith("0:0");
    expect(map.replaceStreamedStaticHitboxes).toHaveBeenCalledWith("1:0", chunk("1:0", 1).hitboxes);
    expect(current.data).toEqual(["1:0"]);
  });

  it("removes streamed hitboxes and the prediction boundary when chunks are evicted", () => {
    const controller = new MapStreamClientController<Record<string, never>, { tile: number }, State>({
      component: {},
      createState: () => ({ keys: new Set() }),
      applyChunk: (state, value) => state.keys.add(value.key),
      removeChunk: (state, key) => state.keys.delete(key),
      getData: (state) => [...state.keys],
    }, manifest("one"));
    controller.receive({
      mapId: "demo",
      revision: "one",
      manifest: manifest("one"),
      chunks: [chunk("0:0", 0), chunk("1:0", 1)],
      removed: [],
    });

    let current = controller.toMapData();
    const data = Object.assign(() => current, {
      set: vi.fn((value) => { current = value; }),
    });
    const map = {
      data,
      replaceStreamedStaticHitboxes: vi.fn(),
      clearStreamedStaticHitboxes: vi.fn(),
    };
    controller.attach(map);
    map.replaceStreamedStaticHitboxes.mockClear();
    map.clearStreamedStaticHitboxes.mockClear();

    controller.receive({
      mapId: "demo",
      revision: "one",
      chunks: [],
      removed: ["0:0"],
    });
    expect(current.data).toEqual(["1:0"]);
    expect(map.clearStreamedStaticHitboxes).toHaveBeenCalledWith("0:0");
    expect(map.replaceStreamedStaticHitboxes).toHaveBeenCalledWith("__boundary__", [
      { x: 98, y: 0, width: 2, height: 100 },
    ]);

    map.clearStreamedStaticHitboxes.mockClear();
    controller.receive({
      mapId: "demo",
      revision: "one",
      chunks: [],
      removed: ["1:0"],
    });
    expect(current.data).toEqual([]);
    expect(map.clearStreamedStaticHitboxes.mock.calls).toEqual([
      ["1:0"],
      ["__boundary__"],
    ]);
  });

  it("requests fresh streaming data when a cached map is loaded again", async () => {
    const listeners = new Map<string, (packet: unknown) => void>();
    let requestCount = 0;
    const socket = {
      on: vi.fn((event: string, callback: (packet: unknown) => void) => listeners.set(event, callback)),
      emit: vi.fn((event: string) => {
        if (event !== MAP_STREAM_REQUEST_EVENT) return;
        requestCount += 1;
        if (requestCount > 1) return;
        listeners.get(MAP_STREAM_EVENT)?.({
          mapId: "demo",
          revision: "one",
          manifest: manifest("one"),
          chunks: [chunk("0:0", 0)],
          removed: [],
        });
      }),
    };
    const { loader } = await createStreamingLoader(socket);

    await loader.load("map-demo");
    let resolved = false;
    const reloaded = loader.load("map-demo").then((value) => { resolved = true; return value });
    await Promise.resolve();
    expect(resolved).toBe(false);
    listeners.get(MAP_STREAM_EVENT)?.({
      mapId: "demo",
      revision: "one",
      manifest: manifest("one"),
      chunks: [chunk("1:0", 1)],
      removed: ["0:0"],
    });
    await expect(reloaded).resolves.toMatchObject({ data: ["1:0"] });

    expect(socket.emit).toHaveBeenCalledTimes(2);
    expect(socket.emit).toHaveBeenNthCalledWith(2, MAP_STREAM_REQUEST_EVENT, { mapId: "demo" });
  });

  it("shares one stream request between concurrent loads", async () => {
    const listeners = new Map<string, (packet: unknown) => void>();
    const socket = {
      on: vi.fn((event: string, callback: (packet: unknown) => void) => listeners.set(event, callback)),
      emit: vi.fn(),
    };
    const { loader, update } = await createStreamingLoader(socket);

    const first = loader.load("map-demo");
    const second = loader.load("demo");
    expect(socket.emit).toHaveBeenCalledTimes(1);

    listeners.get(MAP_STREAM_EVENT)?.({
      mapId: "demo",
      revision: "one",
      manifest: manifest("one"),
      chunks: [chunk("0:0", 0)],
      removed: [],
    });
    const [firstMap, secondMap] = await Promise.all([first, second]);

    expect(firstMap.streamController).toBe(secondMap.streamController);
    expect(update).toHaveBeenCalledTimes(2);
  });

  it("cleans up a timed-out request so a later load can retry", async () => {
    vi.useFakeTimers();
    try {
      const listeners = new Map<string, (packet: unknown) => void>();
      let respond = false;
      const socket = {
        on: vi.fn((event: string, callback: (packet: unknown) => void) => listeners.set(event, callback)),
        emit: vi.fn((event: string) => {
          if (!respond || event !== MAP_STREAM_REQUEST_EVENT) return;
          listeners.get(MAP_STREAM_EVENT)?.({
            mapId: "demo",
            revision: "one",
            manifest: manifest("one"),
            chunks: [chunk("0:0", 0)],
            removed: [],
          });
        }),
      };
      const { loader } = await createStreamingLoader(socket, 20);

      const rejection = expect(loader.load("demo")).rejects.toThrow(
        "Map stream 'demo' was not received after 20ms",
      );
      await vi.advanceTimersByTimeAsync(20);
      await rejection;

      respond = true;
      await expect(loader.load("demo")).resolves.toMatchObject({ id: "demo" });
      expect(socket.emit).toHaveBeenCalledTimes(2);
    }
    finally {
      vi.useRealTimers();
    }
  });
});
