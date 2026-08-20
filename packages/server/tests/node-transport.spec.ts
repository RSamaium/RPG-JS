import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createServer, provideServerModules } from "../src";
import { RpgServerEngine } from "../src/RpgServerEngine";
import {
  MAP_UPDATE_TOKEN_ENV,
  PartyConnection,
  createMapUpdatePayload,
  createMemoryNodeRoomStorage,
  createRpgServerTransport,
} from "../src/node";

function wait(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTiledFixturePath(): string {
  const candidates = [
    resolve(process.cwd(), "samples/cloudflare-mmorpg/src/tiled"),
    resolve(process.cwd(), "../../samples/cloudflare-mmorpg/src/tiled"),
  ];
  const fixturePath = candidates.find(existsSync);

  if (!fixturePath) {
    throw new Error(`Unable to find the Cloudflare MMORPG Tiled fixtures from ${process.cwd()}`);
  }

  return fixturePath;
}

class MockWebSocket {
  readyState = 1;
  sent: string[] = [];
  private handlers = new Map<string, Array<(...args: any[]) => void>>();

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = 3;
    this.emit("close");
  }

  on(event: string, callback: (...args: any[]) => void): void {
    const listeners = this.handlers.get(event) || [];
    listeners.push(callback);
    this.handlers.set(event, listeners);
  }

  emit(event: string, ...args: any[]): void {
    for (const callback of this.handlers.get(event) || []) {
      callback(...args);
    }
  }
}

class MockServer extends RpgServerEngine {
  requests: Array<{ method: string; roomId: string; url: string; body: any }> = [];
  messages: Array<{
    connectionId: string;
    sessionId: string;
    message: string;
  }> = [];
  closedConnections: string[] = [];
  connectedContexts: Array<{
    connectionId: string;
    sessionId: string;
    url: string;
  }> = [];

  constructor(public room: any) {
    super();
  }

  async onRequest(req: any) {
    let body: any;
    try {
      body = await req.json();
    } catch {
      body = await req.text();
    }
    this.requests.push({
      method: req.method,
      roomId: this.room.id,
      url: req.url,
      body,
    });

    return {
      method: req.method,
      roomId: this.room.id,
      url: req.url,
      body,
    };
  }

  async onMessage(message: string, connection: any) {
    this.messages.push({
      connectionId: connection.id,
      sessionId: connection.sessionId,
      message,
    });
  }

  async onConnect(connection: any, context: any) {
    this.connectedContexts.push({
      connectionId: connection.id,
      sessionId: connection.sessionId,
      url: context.request.url,
    });
  }

  async onClose(connection: any) {
    this.closedConnections.push(connection.id);
  }
}

class RealServer extends RpgServerEngine {}

class AuthServer extends RpgServerEngine {
  protected async authenticateConnection(_connection: any, context: any) {
    const url = new URL(context.request.url);
    const token = url.searchParams.get("token");

    if (token !== "valid-token") {
      throw new Error("Authentication failed");
    }

    return "user-1";
  }
}

describe("createRpgServerTransport", () => {
  const originalMapUpdateToken = process.env[MAP_UPDATE_TOKEN_ENV];

  beforeEach(() => {
    PartyConnection.configurePacketLoss(false, 0);
    PartyConnection.configureBandwidth(false, 100);
    PartyConnection.configureLatency(false, 0);
    delete process.env[MAP_UPDATE_TOKEN_ENV];
  });

  it("returns safe defaults before the RPGJS room is initialized", () => {
    const engine = new RpgServerEngine(undefined as any);
    const app = { name: "express-app" };
    const io = { name: "ws-server" };

    engine.app = app;
    engine.io = io;

    expect(engine.getCurrentRoom()).toBeNull();
    expect(engine.getCurrentRoomId()).toBeNull();
    expect(engine.getCurrentRoomKind()).toBe("unknown");
    expect(engine.getCurrentRoomInfo()).toBeNull();
    expect(engine.globalConfig).toEqual({});
    expect(engine.app).toBe(app);
    expect(engine.io).toBe(io);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (typeof originalMapUpdateToken === "string") {
      process.env[MAP_UPDATE_TOKEN_ENV] = originalMapUpdateToken;
      return;
    }
    delete process.env[MAP_UPDATE_TOKEN_ENV];
  });

  it("handles fetch-style HTTP requests without Vite", async () => {
    const transport = createRpgServerTransport(MockServer as any, {
      initializeMaps: false,
    });

    const response = await transport.fetch("http://localhost/parties/main/lobby/echo?foo=bar", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ hello: "world" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      method: "POST",
      roomId: "lobby",
      url: "http://localhost/parties/main/lobby/echo?foo=bar",
      body: { hello: "world" },
    });
  });

  it("handles websocket connections without the Vite wrapper", async () => {
    const transport = createRpgServerTransport(MockServer as any, {
      initializeMaps: false,
    });
    const ws = new MockWebSocket();

    const handled = await transport.acceptWebSocket(ws as any, {
      url: "http://localhost/parties/main/lobby?_pk=player-1",
      method: "GET",
      headers: {
        host: "localhost",
      },
    });

    expect(handled).toBe(true);

    await wait(10);

    const server = transport.getServer("lobby") as MockServer;
    expect(server.connectedContexts).toHaveLength(1);
    expect(server.connectedContexts[0]).toMatchObject({
      sessionId: "player-1",
    });
    expect(server.connectedContexts[0].url).toContain("_pk=player-1");
    expect(server.connectedContexts[0].url).toContain("id=player-1");
    expect(server.connectedContexts[0].connectionId).not.toBe("player-1");
    expect(JSON.parse(ws.sent[0])).toMatchObject({
      type: "connected",
      id: server.connectedContexts[0].connectionId,
    });

    ws.emit("message", Buffer.from("ping"));
    await wait(10);

    expect(server.messages).toEqual([
      {
        connectionId: server.connectedContexts[0].connectionId,
        sessionId: "player-1",
        message: "ping",
      },
    ]);

    ws.emit("close");
    await wait(10);

    expect(server.closedConnections).toEqual([server.connectedContexts[0].connectionId]);
  });

  it("keeps two active websockets when they share the same session id", async () => {
    const transport = createRpgServerTransport(MockServer as any, {
      initializeMaps: false,
    });
    const first = new MockWebSocket();
    const second = new MockWebSocket();
    const request = {
      url: "http://localhost/parties/main/lobby?_pk=shared-session",
      method: "GET",
      headers: {
        host: "localhost",
      },
    };

    expect(await transport.acceptWebSocket(first as any, request)).toBe(true);
    expect(await transport.acceptWebSocket(second as any, request)).toBe(true);

    await wait(10);

    const server = transport.getServer("lobby") as MockServer;
    expect(server.connectedContexts).toHaveLength(2);
    expect(server.connectedContexts.map((context) => context.sessionId)).toEqual(["shared-session", "shared-session"]);
    expect(server.connectedContexts[0].connectionId).not.toBe(server.connectedContexts[1].connectionId);

    const room = transport.getRoom("lobby")!;
    expect(Array.from(room.getConnections())).toHaveLength(2);

    await room.broadcast("hello");
    await wait(10);

    expect(first.sent).toContain("hello");
    expect(second.sent).toContain("hello");
  });

  it("uses the authenticated public id when joining a room", async () => {
    const transport = createRpgServerTransport(AuthServer as any, {
      initializeMaps: false,
    });
    const ws = new MockWebSocket();

    expect(
      await transport.acceptWebSocket(ws as any, {
        url: "http://localhost/parties/main/lobby-1?id=browser-session&token=valid-token",
        method: "GET",
        headers: {
          host: "localhost",
        },
      }),
    ).toBe(true);

    await wait(10);

    const syncMessage = ws.sent.map((message) => JSON.parse(message)).find((message) => message.type === "sync");

    expect(syncMessage).toMatchObject({
      type: "sync",
      value: {
        pId: "user-1",
        players: {
          "user-1": expect.any(Object),
        },
      },
    });

    const room = transport.getRoom("lobby-1")!;
    expect(await room.storage.get("session:browser-session")).toMatchObject({
      publicId: "user-1",
    });
    expect(await room.storage.get("session-public:user-1")).toEqual(["browser-session"]);
  });

  it("exposes public room information for the current lobby room", async () => {
    const transport = createRpgServerTransport(RealServer as any, {
      initializeMaps: false,
    });
    const ws = new MockWebSocket();

    expect(
      await transport.acceptWebSocket(ws as any, {
        url: "http://localhost/parties/main/lobby-1?id=browser-session",
        method: "GET",
        headers: {
          host: "localhost",
        },
      }),
    ).toBe(true);

    await wait(10);

    const server = transport.getServer("lobby-1") as RealServer;

    expect(server.getCurrentRoom()).toBe(server.subRoom);
    expect(server.getCurrentRoomId()).toBe("lobby-1");
    expect(server.getCurrentRoomKind()).toBe("lobby");
    expect(server.globalConfig).toEqual({});
    expect(server.getCurrentRoomInfo()).toMatchObject({
      id: "lobby-1",
      kind: "lobby",
      name: "1",
      className: "LobbyRoom",
      playersCount: 1,
      autoSync: true,
      hasDatabase: true,
    });
  });

  it("calls the server engine auth hook during room connection", async () => {
    const GameServer = createServer({
      providers: [
        provideServerModules([
          {
            engine: {
              auth(_server: RpgServerEngine, socket: any) {
                if (socket.handshake.query.token !== "valid-token") {
                  throw new Error("Authentication failed");
                }
                return "hook-user";
              },
            },
          },
        ]),
      ],
    });
    const transport = createRpgServerTransport(GameServer as any, {
      initializeMaps: false,
    });
    const ws = new MockWebSocket();

    expect(
      await transport.acceptWebSocket(ws as any, {
        url: "http://localhost/parties/main/lobby-1?id=hook-session&token=valid-token",
        method: "GET",
        headers: {
          host: "localhost",
        },
      }),
    ).toBe(true);

    await wait(10);

    const syncMessage = ws.sent.map((message) => JSON.parse(message)).find((message) => message.type === "sync");

    expect(syncMessage.value.pId).toBe("hook-user");
    expect(await transport.getRoom("lobby-1")!.storage.get("session:hook-session")).toMatchObject({
      publicId: "hook-user",
    });
  });

  it("runs onAccepted after the connected packet with immutable request context", async () => {
    const ws = new MockWebSocket();
    const accepted = vi.fn();
    const GameServer = createServer({
      providers: [
        provideServerModules([
          {
            engine: {
              auth(_server: RpgServerEngine, socket: any) {
                socket.conn.setState({ projectId: "project-a" });
                return "accepted-user";
              },
            },
            player: {
              onAccepted(_player: any, context: any) {
                accepted({
                  packetTypes: ws.sent.map((packet) => JSON.parse(packet).type),
                  query: context.query,
                  state: context.connection.state,
                  queryFrozen: Object.isFrozen(context.query),
                });
              },
            },
          },
        ]),
      ],
    });
    const transport = createRpgServerTransport(GameServer as any, {
      initializeMaps: false,
    });

    await transport.acceptWebSocket(ws as any, {
      url: "http://localhost/parties/main/lobby-1?id=accepted-session&game=project-a",
      method: "GET",
      headers: { host: "localhost" },
    });

    expect(accepted).toHaveBeenCalledWith(expect.objectContaining({
      packetTypes: expect.arrayContaining(["connected"]),
      query: expect.objectContaining({ game: "project-a" }),
      state: expect.objectContaining({ projectId: "project-a" }),
      queryFrozen: true,
    }));
  });

  it("rejects a websocket connection when authentication fails", async () => {
    const transport = createRpgServerTransport(AuthServer as any, {
      initializeMaps: false,
    });
    const ws = new MockWebSocket();

    expect(
      await transport.acceptWebSocket(ws as any, {
        url: "http://localhost/parties/main/lobby-1?id=browser-session&token=invalid-token",
        method: "GET",
        headers: {
          host: "localhost",
        },
      }),
    ).toBe(true);

    await wait(10);

    expect(ws.readyState).toBe(3);
    expect(ws.sent).toEqual([]);
    expect(Array.from(transport.getRoom("lobby-1")!.getConnections())).toHaveLength(0);
  });

  it("rejects map/update in production when the token is missing", async () => {
    process.env[MAP_UPDATE_TOKEN_ENV] = "prod-secret";

    const transport = createRpgServerTransport(RealServer as any, {
      initializeMaps: false,
    });

    const response = await transport.fetch("http://localhost/parties/main/map-town/map/update", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        id: "town",
        width: 320,
        height: 240,
        events: [],
      }),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      error: "Unauthorized map update",
    });
  });

  it("sends the configured token when transport.updateMap() is used", async () => {
    process.env[MAP_UPDATE_TOKEN_ENV] = "prod-secret";

    const transport = createRpgServerTransport(RealServer as any, {
      initializeMaps: false,
      mapUpdateToken: "prod-secret",
    });

    const response = await transport.updateMap("town", {
      id: "town",
      width: 320,
      height: 240,
      events: [],
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it.each([
    {
      label: "array",
      database: [
        { _id: "potion", itemType: "item", name: "Published potion" },
      ],
      expected: {
        potion: { id: "potion", name: "Published potion" },
      },
    },
    {
      label: "object",
      database: {
        sword: { id: "sword", name: "Published sword" },
      },
      expected: {
        sword: { id: "sword", name: "Published sword" },
      },
    },
  ])("preserves a published $label database through validation and restoration", async ({
    database,
    expected,
  }) => {
    const storage = createMemoryNodeRoomStorage();
    const GameServer = createServer({
      providers: [
        provideServerModules([
          {
            database(map: any) {
              const published = map.data()?.database;
              if (!Array.isArray(published)) {
                return published ?? {};
              }
              return Object.fromEntries(published.map((record) => [
                record._id ?? record.id,
                {
                  id: record._id ?? record.id,
                  name: record.name,
                },
              ]));
            },
          },
        ]),
      ],
    });
    const transport = createRpgServerTransport(GameServer as any, {
      initializeMaps: false,
      storage,
    });

    const response = await transport.updateMap("published-database", {
      id: "published-database",
      width: 320,
      height: 240,
      events: [],
      database,
    });

    expect(response.status).toBe(200);
    const room = transport.getRoom("map-published-database")!;
    const map = (transport.getServer("map-published-database") as RealServer)
      .getCurrentRoom<any>();
    expect(await room.storage.get("$room:rpgjs-map-source")).toMatchObject({
      database,
    });
    expect(map.database()).toEqual(expected);

    map.database.set({});
    map.data.set(await room.storage.get("$room:rpgjs-map-source"));
    await map.onRestore();

    expect(map.database()).toEqual(expected);
  });

  it("keeps map updates without a published database backward compatible", async () => {
    const transport = createRpgServerTransport(RealServer as any, {
      initializeMaps: false,
    });

    const response = await transport.updateMap("legacy-map", {
      id: "legacy-map",
      width: 320,
      height: 240,
      events: [],
    });

    expect(response.status).toBe(200);
    const map = (transport.getServer("map-legacy-map") as RealServer)
      .getCurrentRoom<any>();
    expect(map.data()).not.toHaveProperty("database");
    expect(map.database()).toEqual({});
  });

  it("authenticates and durably restores world updates", async () => {
    process.env[MAP_UPDATE_TOKEN_ENV] = "prod-secret";
    const transport = createRpgServerTransport(RealServer as any, {
      initializeMaps: false,
      mapUpdateToken: "prod-secret",
    });
    await transport.updateMap("port", {
      id: "port",
      width: 1440,
      height: 960,
      events: [],
    });
    const worldMaps = [
      { id: "port", worldX: 0, worldY: 0, width: 1440, height: 960 },
      { id: "marsh", worldX: 0, worldY: 960, width: 1440, height: 960 },
    ];
    const response = await transport.fetch(
      "http://localhost/parties/main/map-port/world/main-world/update",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-rpgjs-map-update-token": "prod-secret",
        },
        body: JSON.stringify({ id: "main-world", maps: worldMaps }),
      },
    );

    expect(response.status).toBe(200);
    const server = transport.getServer("map-port") as RealServer;
    const mapRoom = server.getCurrentRoom<any>();
    expect(mapRoom.getWorldMapsManager()?.getMapInfo("marsh")?.worldY).toBe(960);
    expect(await transport.getRoom("map-port")!.storage.get("$room:rpgjs-world-maps"))
      .toEqual({
        id: "main-world",
        maps: expect.arrayContaining(worldMaps.map((map) => expect.objectContaining(map))),
      });

    mapRoom.worldMapsManager = undefined;
    await mapRoom.onRestore();
    expect(mapRoom.getWorldMapsManager()?.getMapInfo("marsh")?.worldY).toBe(960);
  });

  it("rejects world updates when the administration token is missing", async () => {
    process.env[MAP_UPDATE_TOKEN_ENV] = "prod-secret";
    const transport = createRpgServerTransport(RealServer as any, {
      initializeMaps: false,
    });

    const response = await transport.fetch(
      "http://localhost/parties/main/map-port/world/main-world/update",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ maps: [] }),
      },
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: "Unauthorized world update" });
  });

  it("builds a publishable map payload from a local Tiled base path", async () => {
    const tiledBasePath = getTiledFixturePath();
    const payload = await createMapUpdatePayload("map-demo", { maps: [] } as any, { tiledBasePaths: [tiledBasePath] });

    expect(payload).toMatchObject({
      id: "demo",
      width: 800,
      height: 640,
      events: [],
      parsedMap: {
        width: 25,
        height: 20,
        tilewidth: 32,
        tileheight: 32,
      },
    });
    expect(payload.data).toContain("<map");
    expect(payload.parsedMap.tilesets).toHaveLength(4);
    expect(payload.parsedMap.tilesets[0]).toMatchObject({
      source: "[Base]BaseChip_pipo.tsx",
      image: {
        source: "[Base]BaseChip_pipo.png",
      },
    });
  });

  it("transforms a trusted payload before publishing it remotely", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    const transport = createRpgServerTransport(RealServer as any, {
      initializeMaps: false,
    });

    const response = await transport.publishMap("town", {
      target: "http://127.0.0.1:8787",
      transformPayload(payload, mapId) {
        return { ...(payload as object), mapId, provider: "studio" };
      },
    });

    expect(response.status).toBe(204);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(String(options?.body))).toMatchObject({
      id: "town",
      mapId: "town",
      provider: "studio",
    });
  });

  it("publishes runtime world topology to every map room", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    const transport = createRpgServerTransport(RealServer as any, {
      initializeMaps: false,
      mapUpdateToken: "prod-secret",
    });
    const maps = [
      { id: "port", worldX: 0, worldY: 0, width: 1440, height: 960 },
      { id: "marsh", worldX: 0, worldY: 960, width: 1440, height: 960 },
    ];

    const response = await transport.publishMap("port", {
      target: "http://127.0.0.1:8787",
      transformPayload(payload) {
        return {
          ...(payload as object),
          worldUpdates: [{ id: "main-world", maps }],
        };
      },
    });

    expect(response.status).toBe(204);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      "http://127.0.0.1:8787/parties/main/map-port/map/update",
      "http://127.0.0.1:8787/parties/main/map-port/world/main-world/update",
      "http://127.0.0.1:8787/parties/main/map-marsh/world/main-world/update",
    ]);
    expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toEqual({
      id: "main-world",
      maps,
    });
  });

  it("resolves external tilesets next to a preloaded local TMX document", async () => {
    const tiledBasePath = getTiledFixturePath();
    const mapFile = resolve(tiledBasePath, "demo.tmx");
    const payload = await createMapUpdatePayload(
      "map-demo",
      {
        maps: [
          {
            id: "demo",
            file: mapFile,
            data: await readFile(mapFile, "utf8"),
          },
        ],
      } as any,
      {
        host: "127.0.0.1:1",
        tiledBasePaths: [tiledBasePath],
      },
    );

    expect(payload.parsedMap.tilesets).toHaveLength(4);
    expect(payload.parsedMap.tilesets[0].image.source).toBe("[Base]BaseChip_pipo.png");
  });

  it("exposes public room information and global config for the current map room", async () => {
    const transport = createRpgServerTransport(RealServer as any, {
      initializeMaps: false,
    });
    const mapConfig = {
      startMapId: "town",
      weather: {
        effect: "rain",
      },
    };

    const response = await transport.updateMap("town", {
      id: "town",
      width: 320,
      height: 240,
      config: mapConfig,
      events: [],
    });

    expect(response.status).toBe(200);

    const server = transport.getServer("map-town") as RealServer;

    expect(server.getCurrentRoom()).toBe(server.subRoom);
    expect(server.getCurrentRoomId()).toBe("map-town");
    expect(server.getCurrentRoomKind()).toBe("map");
    expect(server.globalConfig).toEqual(mapConfig);
    expect(server.getCurrentRoomInfo()).toMatchObject({
      id: "map-town",
      kind: "map",
      name: "town",
      className: "RpgMap",
      playersCount: 0,
      autoSync: true,
      hasDatabase: true,
    });
  });
});
