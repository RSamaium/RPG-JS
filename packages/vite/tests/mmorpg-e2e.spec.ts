import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createServer as createHttpServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { WebSocket as NodeWebSocket, WebSocketServer } from "ws";
import { defineModule, Direction } from "@rpgjs/common";
import {
  clearInject as clearServerInject,
  createServer,
  provideServerModules,
  type RpgPlayer,
  type RpgServer,
} from "@rpgjs/server";
import { createMemoryNodeRoomStorage, createRpgServerTransport, type RpgServerTransport } from "@rpgjs/server/node";
import {
  clearInject as clearClientInject,
  inject,
  provideClientGlobalConfig,
  provideClientModules,
  provideMmorpg,
  RpgClientEngine,
  startGame,
  type RpgClient,
} from "../../client/src";
import { provideTestingLoadMap } from "../../testing/src";

/**
 * End-to-end MMORPG harness: a real Node HTTP/WebSocket server hosting the
 * RPGJS rooms (lobby and maps), and a real client engine connected through
 * `provideMmorpg()`. Room transfers go through actual WebSocket reconnections.
 */
interface RunningServer {
  transport: RpgServerTransport;
  wsServer: WebSocketServer;
  httpServer: Server;
  host: string;
}

let running: RunningServer | undefined;
let client: RpgClientEngine | undefined;

async function startMmorpgServer(server: RpgServer): Promise<RunningServer> {
  const serverClass = createServer({
    providers: [provideServerModules([server])],
  });
  const transport = createRpgServerTransport(serverClass as any, {
    storage: createMemoryNodeRoomStorage(),
  });
  const wsServer = new WebSocketServer({ noServer: true });
  const httpServer = createHttpServer((req, res) => {
    void transport.handleNodeRequest(req, res, () => {
      res.statusCode = 404;
      res.end();
    }, { mountedPath: "/parties" });
  });
  httpServer.on("upgrade", (request, socket, head) => {
    void transport.handleUpgrade(wsServer as any, request, socket, head);
  });
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const { port } = httpServer.address() as AddressInfo;
  running = { transport, wsServer, httpServer, host: `127.0.0.1:${port}` };
  return running;
}

async function startClient(host: string, clientModule: RpgClient = {}): Promise<RpgClientEngine> {
  await startGame({
    providers: [
      provideClientGlobalConfig({ bootstrapCanvasOptions: { enableLayout: false } }),
      provideTestingLoadMap(),
      provideClientModules([clientModule]),
      ...provideMmorpg({
        host,
        connectionIdScope: "ephemeral",
        // jsdom and the Node global WebSocket use incompatible Event classes
        socketOptions: { WebSocket: NodeWebSocket },
      }),
    ],
  } as any);
  client = inject<RpgClientEngine>(RpgClientEngine);
  return client;
}

async function waitFor<T>(
  read: () => T | undefined | null | false,
  label: string,
  timeout = 8000,
): Promise<T> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    const value = read();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`waitFor: timeout while waiting for ${label}`);
}

/**
 * The player of a map room once it has joined it. A session transfer creates
 * the player in the target room before the client connects, so the player is
 * only returned when it is bound to that map.
 */
function joinedPlayer(roomId: string): RpgPlayer | undefined {
  const server = (running!.transport as any).servers.get(roomId);
  const players = server?.subRoom?.players?.() ?? {};
  const player = Object.values(players)[0] as RpgPlayer | undefined;
  return player?.getCurrentMap()?.id === roomId.replace(/^map-/, "") ? player : undefined;
}

/** The local player once the client scene shows the given map. */
function localPlayerOn(engine: RpgClientEngine, roomId: string) {
  if ((engine as any).webSocket.getCurrentRoom() !== roomId) return undefined;
  return engine.scene?.getCurrentPlayer?.();
}

beforeEach(() => {
  document.body.innerHTML = `<div id="rpg"></div>`;
});

afterEach(async () => {
  if (client) {
    client.clear();
    client.disconnect();
    client = undefined;
  }
  if (running) {
    const { wsServer, httpServer } = running;
    running = undefined;
    for (const socket of wsServer.clients) socket.terminate();
    wsServer.close();
    httpServer.closeAllConnections();
    await new Promise((resolve) => httpServer.close(resolve));
  }
  // Let CanvasEngine callbacks scheduled during teardown flush before removing
  // the DI contexts they may still read.
  await new Promise((resolve) => setTimeout(resolve, 0));
  clearClientInject();
  clearServerInject();
});

describe("MMORPG end-to-end", () => {
  test("connects through the lobby, transfers to the start map and runs server hooks", async () => {
    const calls: string[] = [];
    const server = await startMmorpgServer(defineModule<RpgServer>({
      maps: [{ id: "map1" }],
      player: {
        async onConnected(player) {
          calls.push("onConnected");
          await player.changeMap("map1", { x: 100, y: 100 });
        },
        onJoinMap(_player, map) {
          calls.push(`onJoinMap:${map.id}`);
        },
      },
    }) as RpgServer);

    const engine = await startClient(server.host);
    await waitFor(() => calls.includes("onJoinMap:map1"), "onJoinMap");
    const currentPlayer = await waitFor(() => localPlayerOn(engine, "map-map1"), "the local player");

    expect(calls).toEqual(["onConnected", "onJoinMap:map1"]);
    expect([...(server.transport as any).rooms.keys()]).toEqual(["lobby-1", "map-map1"]);
    expect((engine as any).webSocket.getCurrentRoom()).toBe("map-map1");
    expect(currentPlayer.x()).toBe(100);
    expect(currentPlayer.y()).toBe(100);
  });

  test("runs client engine and scene hooks in MMORPG mode", async () => {
    const clientCalls: string[] = [];
    const server = await startMmorpgServer(defineModule<RpgServer>({
      maps: [{ id: "map1" }],
      player: {
        async onConnected(player) {
          await player.changeMap("map1", { x: 100, y: 100 });
        },
      },
    }) as RpgServer);

    await startClient(server.host, {
      engine: {
        onConnected() {
          clientCalls.push("engine:onConnected");
        },
      },
      sceneMap: {
        onAfterLoading() {
          clientCalls.push("sceneMap:onAfterLoading");
        },
      },
    });

    await waitFor(() => clientCalls.includes("sceneMap:onAfterLoading"), "sceneMap onAfterLoading");
    expect(clientCalls).toContain("engine:onConnected");
  });

  test("moves the player on the server from client inputs and dispatches onMove", async () => {
    let moves = 0;
    const server = await startMmorpgServer(defineModule<RpgServer>({
      maps: [{ id: "map1" }],
      player: {
        async onConnected(player) {
          await player.changeMap("map1", { x: 100, y: 100 });
        },
        onMove() {
          moves += 1;
        },
      },
    }) as RpgServer);

    const engine = await startClient(server.host);
    const player = await waitFor(() => joinedPlayer("map-map1"), "the server player");
    await waitFor(() => localPlayerOn(engine, "map-map1"), "the local player");
    const startX = player.x();

    const deadline = Date.now() + 3000;
    while (player.x() <= startX && Date.now() < deadline) {
      await engine.processInput({ input: Direction.Right });
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    expect(player.x()).toBeGreaterThan(startX);
    expect(player.direction()).toBe(Direction.Right);
    await waitFor(() => moves > 0, "onMove");
  });

  test("changes map between two map rooms", async () => {
    const joined: string[] = [];
    const server = await startMmorpgServer(defineModule<RpgServer>({
      maps: [{ id: "map1" }, { id: "map2" }],
      player: {
        async onConnected(player) {
          await player.changeMap("map1", { x: 100, y: 100 });
        },
        onJoinMap(_player, map) {
          joined.push(map.id);
        },
      },
    }) as RpgServer);

    const engine = await startClient(server.host);
    const player = await waitFor(() => joinedPlayer("map-map1"), "the server player on map1");
    await waitFor(() => localPlayerOn(engine, "map-map1"), "the local player on map1");

    await player.changeMap("map2", { x: 200, y: 150 });

    await waitFor(() => (engine as any).webSocket.getCurrentRoom() === "map-map2", "the client transfer to map2");
    const movedPlayer = await waitFor(() => joinedPlayer("map-map2"), "the server player on map2");
    const localPlayer = await waitFor(() => {
      const current = localPlayerOn(engine, "map-map2");
      return current && current.x() === 200 ? current : undefined;
    }, "the local player on map2");

    expect(joined).toEqual(["map1", "map2"]);
    expect(movedPlayer.x()).toBe(200);
    expect(localPlayer.y()).toBe(150);
  });

  test("dispatches onDisconnected when the client closes its socket", async () => {
    const calls: string[] = [];
    const server = await startMmorpgServer(defineModule<RpgServer>({
      maps: [{ id: "map1" }],
      player: {
        async onConnected(player) {
          await player.changeMap("map1", { x: 100, y: 100 });
        },
        onLeaveMap(_player, map) {
          calls.push(`onLeaveMap:${map.id}`);
        },
        onDisconnected() {
          calls.push("onDisconnected");
        },
      },
    }) as RpgServer);

    const engine = await startClient(server.host);
    await waitFor(() => joinedPlayer("map-map1"), "the server player");
    await waitFor(() => localPlayerOn(engine, "map-map1"), "the local player");

    engine.disconnect();
    client = undefined;

    await waitFor(() => calls.includes("onDisconnected"), "onDisconnected");
    expect(calls).toContain("onLeaveMap:map1");
  });
});
