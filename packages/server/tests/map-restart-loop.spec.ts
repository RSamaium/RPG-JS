// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer, provideServerModules, Move } from "../src";
import { createMemoryNodeRoomStorage, createRpgServerTransport } from "../src/node";

/**
 * A map room created again from its storage (an evicted Durable Object, a restarted process) must rebuild its map
 * and run its game loop as soon as a player joins, whether or not the client asks for the map stream.
 * See https://github.com/RSamaium/RPG-JS/issues/519
 */
describe("a map room created again from its storage", () => {
  const maps: any[] = [];

  afterEach(() => {
    for (const map of maps.splice(0)) map.setAutoTick(false);
    vi.restoreAllMocks();
  });

  class MockWebSocket {
    readyState = 1;
    sent: string[] = [];
    private listeners = new Map<string, Array<(...args: any[]) => void>>();
    send(data: string): void { this.sent.push(data); }
    close(): void { this.readyState = 3; this.emit("close"); }
    on(event: string, listener: (...args: any[]) => void): void {
      this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);
    }
    emit(event: string, ...args: any[]): void {
      for (const listener of this.listeners.get(event) ?? []) listener(...args);
    }
  }

  const GameServer = createServer({
    providers: [
      provideServerModules([
        {
          maps: [
            {
              id: "town",
              events: [
                {
                  id: "walker",
                  x: 320,
                  y: 320,
                  event: {
                    onInit(this: any) {
                      this.infiniteMoveRoute([Move.tileRandom()]);
                    },
                  },
                },
              ],
            },
          ],
        },
      ]),
    ],
  });

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  /** Publish the map while nobody is connected, then start a new transport from the storage snapshot. */
  const restartedTransport = async () => {
    const storage = createMemoryNodeRoomStorage();
    const first = createRpgServerTransport(GameServer as any, { initializeMaps: false, storage });
    const published = await first.updateMap("town", { id: "town", width: 1600, height: 1600, events: [] });
    expect(published.status).toBe(200);
    maps.push(mapOf(first));

    const restoredStorage = createMemoryNodeRoomStorage({ snapshot: storage.snapshot() });
    return createRpgServerTransport(GameServer as any, { initializeMaps: false, storage: restoredStorage });
  };

  const mapOf = (transport: any) => transport.getServer("map-town").getCurrentRoom() as any;

  const connect = async (transport: any, session: string) => {
    const ws = new MockWebSocket();
    await transport.acceptWebSocket(ws as any, {
      url: `http://localhost/parties/main/map-town?id=${session}`,
      method: "GET",
      headers: { host: "localhost" },
    });
    maps.push(mapOf(transport));
    return ws;
  };

  const walkerPosition = (map: any) => {
    const walker = map.getEvent("walker");
    return walker ? `${walker.x()},${walker.y()}` : undefined;
  };

  it("rebuilds the map and moves its events for a player who does not ask for the map stream", async () => {
    const transport = await restartedTransport();

    await connect(transport, "first-session");
    await wait(50);

    const map = mapOf(transport);
    expect(map.data()?.id).toBe("town");
    expect(map.isAutoTickEnabled()).toBe(true);
    const positions = new Set<string | undefined>();
    for (let i = 0; i < 20; i += 1) {
      positions.add(walkerPosition(map));
      await wait(50);
    }
    expect(positions.has(undefined)).toBe(false);
    expect(positions.size).toBeGreaterThan(1);
  });

  it("runs its loop for a player who joins after the first one left", async () => {
    const transport = await restartedTransport();
    const first = await connect(transport, "first-session");
    await wait(50);
    first.close();
    await wait(50);
    expect(mapOf(transport).isAutoTickEnabled()).toBe(false);

    const second = await connect(transport, "second-session");
    second.emit("message", JSON.stringify({ action: "map.stream.request", value: { mapId: "town" } }));
    await wait(50);

    expect(mapOf(transport).isAutoTickEnabled()).toBe(true);
  });

  it("runs its loop when the map is published while a player is connected to a room that was left empty", async () => {
    const transport = createRpgServerTransport(GameServer as any, { initializeMaps: false });
    const first = await connect(transport, "first-session");
    await wait(50);
    first.close();
    await wait(50);
    await connect(transport, "second-session");
    await wait(50);
    expect(mapOf(transport).data()?.id).toBeUndefined();

    const published = await transport.updateMap("town", { id: "town", width: 1600, height: 1600, events: [] });
    expect(published.status).toBe(200);

    const map = mapOf(transport);
    expect(map.isAutoTickEnabled()).toBe(true);
    const before = map.getTick();
    await wait(200);
    expect(map.getTick()).toBeGreaterThan(before);
  });

  it("does not rebuild a running map when another player joins", async () => {
    const transport = await restartedTransport();
    await connect(transport, "first-session");
    await wait(50);
    const map = mapOf(transport);
    const walker = map.getEvent("walker");
    const updateMap = vi.spyOn(map, "updateMap");

    await connect(transport, "second-session");
    await wait(50);

    expect(updateMap).not.toHaveBeenCalled();
    expect(map.getEvent("walker")).toBe(walker);
  });
});
