import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createServer as createHttpServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { WebSocket as NodeWebSocket, WebSocketServer } from "ws";
import { defineModule, Direction, getMapChunkKey, type MapStreamDefinition } from "@rpgjs/common";
import {
  clearInject as clearServerInject,
  createServer,
  provideServerMapStreaming,
  provideServerModules,
  provideServerRooms,
  RpgGameplayRoom,
  RpgRoom,
  type RpgPlayer,
  type RpgServer,
} from "@rpgjs/server";
import { createMemoryNodeRoomStorage, createRpgServerTransport, type RpgServerTransport } from "@rpgjs/server/node";
import {
  clearInject as clearClientInject,
  inject,
  provideClientGlobalConfig,
  provideClientMapStreaming,
  provideClientModules,
  provideClientScenes,
  provideMmorpg,
  RpgClientEngine,
  RpgGui,
  startGame,
  type RpgClient,
} from "../../client/src";
import { provideTestingLoadMap } from "../../testing/src";
import {
  isInTurnBattle,
  provideTurnBattleServer,
  startTurnBattle,
  turnBattleEnemy,
  turnBattleTroop,
} from "../../turn-battle/src/server";
import { provideTurnBattleClient } from "../../turn-battle/src/client";
import {
  isInTacticalBattle,
  provideTacticalServer,
  startTacticalBattle,
  tacticalEncounter,
  tacticalUnit,
} from "../../tactical-rpg/src/server";
import { provideTacticalClient } from "../../tactical-rpg/src/client";

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

async function startMmorpgServer(server: RpgServer | RpgServer[], providers: unknown[] = []): Promise<RunningServer> {
  const serverClass = createServer({
    providers: [provideServerModules(Array.isArray(server) ? server : [server]), ...providers],
  } as any);
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

async function startClient(
  host: string,
  clientModule: RpgClient = {},
  providers: unknown[] = [provideTestingLoadMap()],
): Promise<RpgClientEngine> {
  await startGame({
    providers: [
      provideClientGlobalConfig({ bootstrapCanvasOptions: { enableLayout: false } }),
      ...providers,
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

  test("draws the picture of a map in a gameplay room from the map room stream", async () => {
    class ArenaRoom extends RpgGameplayRoom {}
    RpgRoom({ kind: "arena", path: "arena-{id}", map: (params) => params.id })(ArenaRoom);

    const compileMap = (mapData: { id: string }): MapStreamDefinition => {
      const mapId = String(mapData.id).replace(/^map-/, "");
      const chunks = Object.fromEntries([0, 1].map((x) => {
        const key = getMapChunkKey(x, 0);
        return [key, {
          key,
          x,
          y: 0,
          bounds: { x: x * 160, y: 0, width: 160, height: 160 },
          renderData: { tile: x },
          hitboxes: [{ x: x * 160, y: 0, width: 16, height: 16 }],
        }];
      }));
      return {
        manifest: {
          protocol: 1, mapId, revision: "one", width: 320, height: 160,
          chunkWidth: 160, chunkHeight: 160, columns: 2, rows: 1, renderData: { name: mapId },
        },
        chunks,
      };
    };
    const server = await startMmorpgServer([
      defineModule<RpgServer>({
        maps: [{ id: "map1" }],
        player: {
          async onConnected(player) {
            await player.changeMap("map1", { x: 100, y: 100 });
          },
        },
      }) as RpgServer,
      provideServerMapStreaming({ compile: compileMap }, { loadRadius: 0, retainRadius: 0 }),
    ], [provideServerRooms([ArenaRoom])]);

    const applied: unknown[] = [];
    let earlyView: Promise<any> | undefined;
    const engine = await startClient(server.host, {}, [
      ...provideClientMapStreaming({
        adapter: {
          component: () => null,
          createState: (manifest) => ({ name: (manifest.renderData as any).name, tiles: [] as number[] }),
          applyChunk: (state: any, chunk) => {
            applied.push(chunk);
            state.tiles.push((chunk.renderData as any).tile);
          },
          removeChunk: () => {},
          getData: (state: any) => ({ ...state, tiles: [...state.tiles].sort() }),
        },
      }),
      provideClientScenes([{
        kind: "arena",
        component: () => null as any,
        // Like <MapView />, ask before the socket has reached the room.
        onBeforeEnter() {
          earlyView = inject<RpgClientEngine>(RpgClientEngine).openMapView();
        },
      }]),
    ]);
    const player = await waitFor(() => joinedPlayer("map-map1"), "the server player on map1");
    await waitFor(() => localPlayerOn(engine, "map-map1"), "the local player on map1");
    // A room change during the streamed map load would be undone when that load ends.
    await waitFor(() => (engine as any).sceneMap.data()?.id === "map1" && !(engine as any).mapTransitionInProgress, "the map1 load");
    await new Promise((resolve) => setTimeout(resolve, 50));

    applied.length = 0;
    await player.changeRoom({ kind: "arena", params: { id: "map1" } });
    await waitFor(() => earlyView, "the map view request");
    const view = await earlyView;
    expect(engine.activeSceneKind()).toBe("arena");
    expect((engine as any).webSocket.getCurrentRoom()).toBe("arena-map1");
    expect(view).toMatchObject({ id: "map1", width: 320, height: 160, data: { name: "map1", tiles: [0, 1] } });
    // The whole map is sent, without the hitboxes the map scene uses for prediction.
    expect(applied).toHaveLength(2);
    expect(applied.every((chunk: any) => chunk.hitboxes.length === 0)).toBe(true);
    expect(view.streamController).toBeUndefined();
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

  describe("turn-based battle", () => {
    const TURN_BATTLE_GUI = "turn-battle";
    const battleModule = () =>
      defineModule<RpgServer>({
        maps: [{ id: "map1" }],
        database: {
          slime: turnBattleEnemy({
            name: "Slime",
            turnBattle: { battler: "slime", stats: { maxHp: 500, maxSp: 0, atk: 1, def: 50, mag: 1, mdef: 50, agi: 1, luk: 1 } },
          }),
          slimes: turnBattleTroop({ turnBattle: { enemies: ["slime"] } }),
        },
        player: {
          async onConnected(player) {
            await player.changeMap("map1", { x: 100, y: 100 });
          },
        },
      }) as RpgServer;

    /** The data of the battle GUI as the client received it (the packets of the server). */
    const battleData = () => {
      const gui = inject(RpgGui);
      return gui.isDisplaying(TURN_BATTLE_GUI) ? (gui.get(TURN_BATTLE_GUI)!.data() as any) : undefined;
    };

    test("opens the battle on the client and applies a command sent through the GUI", async () => {
      const server = await startMmorpgServer(battleModule(), [provideTurnBattleServer()]);
      const engine = await startClient(server.host, {}, [provideTestingLoadMap(), provideTurnBattleClient()]);
      const player = await waitFor(() => joinedPlayer("map-map1"), "the server player");
      await waitFor(() => localPlayerOn(engine, "map-map1"), "the local player");

      void startTurnBattle(player, "slimes", { seed: 1 });
      const opening = await waitFor(() => battleData()?.state, "the battle GUI");
      expect(isInTurnBattle(player)).toBe(true);

      // The hero acts first (the slime is slow): guard, through the GUI channel.
      const actor = await waitFor(() => battleData()?.state?.actor, "the hero's turn");
      inject(RpgGui).guiInteraction(TURN_BATTLE_GUI, "command", { revision: battleData().state.revision, actor, command: { type: "guard" } });
      await waitFor(() => battleData()?.state?.revision > opening.revision, "the authoritative state after the command");
      expect(battleData().error).toBeUndefined();
    });

    test("plays to the end through the GUI: the player escapes, closes the result and is free on the map with their HP", async () => {
      const server = await startMmorpgServer(battleModule(), [provideTurnBattleServer()]);
      const engine = await startClient(server.host, {}, [provideTestingLoadMap(), provideTurnBattleClient()]);
      const player = await waitFor(() => joinedPlayer("map-map1"), "the server player");
      await waitFor(() => localPlayerOn(engine, "map-map1"), "the local player");

      const battle = startTurnBattle(player, "slimes", { seed: 1 });
      const actor = await waitFor(() => battleData()?.state?.actor, "the hero's turn");
      inject(RpgGui).guiInteraction(TURN_BATTLE_GUI, "command", { revision: battleData().state.revision, actor, command: { type: "escape" } });
      const end = await waitFor(() => battleData()?.state?.result, "the result on the client");
      expect(end.outcome).toBe("escape");
      const hero = battleData().state.combatants.find((c: any) => c.id === actor);

      // The result screen is closed on the client: the battle resolves and the GUI goes away.
      inject(RpgGui).guiInteraction(TURN_BATTLE_GUI, "close", {});
      await expect(battle).resolves.toMatchObject({ outcome: "escape" });
      await waitFor(() => !inject(RpgGui).isDisplaying(TURN_BATTLE_GUI), "the battle GUI closed");
      expect(isInTurnBattle(player)).toBe(false);
      expect(player.hp).toBe(hero.hp);
    });

    test("frees a player who disconnects during a battle", async () => {
      const server = await startMmorpgServer(battleModule(), [provideTurnBattleServer()]);
      const engine = await startClient(server.host, {}, [provideTestingLoadMap(), provideTurnBattleClient()]);
      const player = await waitFor(() => joinedPlayer("map-map1"), "the server player");
      await waitFor(() => localPlayerOn(engine, "map-map1"), "the local player");

      const battle = startTurnBattle(player, "slimes", { seed: 1 });
      await waitFor(() => battleData()?.state, "the battle GUI");

      engine.disconnect();
      client = undefined;

      // The battle ends without anyone left to fight it, and the player is no longer busy.
      const result = await battle;
      expect(result.outcome).not.toBe("victory");
      expect(isInTurnBattle(player)).toBe(false);
    });
  });

  describe("tactical battle", () => {
    const TACTICAL_GUI = "tactical-hud";
    const battleModule = () =>
      defineModule<RpgServer>({
        // An event of the map, hidden on the fighter's screen during the battle.
        maps: [{ id: "map1", events: [{ id: "guard", x: 300, y: 300, event: { onInit() {} } }] }],
        database: {
          wolf: tacticalUnit({ name: "Wolf", tactical: { role: "warrior", battler: "wolf", stats: { hp: 40, sp: 0, power: 8, range: 1, move: 3 } } }),
          "guard-room": tacticalEncounter({
            name: "Guard room",
            tactical: { allies: [{ hero: true, x: 2, y: 4 }], enemies: [{ unit: "wolf", x: 2, y: 0 }] },
          }),
        },
        player: {
          async onConnected(player) {
            await player.changeMap("map1", { x: 100, y: 100 });
          },
        },
      }) as RpgServer;

    /** The data of the tactical HUD as the client received it (the packets of the server). */
    const hudData = () => {
      const gui = inject(RpgGui);
      return gui.isDisplaying(TACTICAL_GUI) ? (gui.get(TACTICAL_GUI)!.data() as any) : undefined;
    };

    test("opens the HUD on the client and starts the battle from a command of the GUI", async () => {
      const server = await startMmorpgServer(battleModule(), [provideTacticalServer()]);
      const engine = await startClient(server.host, {}, [provideTestingLoadMap(), provideTacticalClient()]);
      const player = await waitFor(() => joinedPlayer("map-map1"), "the server player");
      await waitFor(() => localPlayerOn(engine, "map-map1"), "the local player");

      void startTacticalBattle(player, "guard-room");
      const opening = await waitFor(() => hudData()?.state, "the tactical HUD");
      expect(opening.started).toBe(false);
      expect(isInTacticalBattle(player)).toBe(true);
      // The hero of the player is read on the server and synchronised to the client.
      expect(opening.units.some((u: any) => u.player === player.id)).toBe(true);

      // Sent with the latest revision the client holds, again if the server refused a stale one (as the HUD does).
      let sentAt = 0;
      await waitFor(() => {
        const data = hudData();
        if (data?.state?.started) return true;
        if (data && Date.now() - sentAt > 500) {
          sentAt = Date.now();
          inject(RpgGui).guiInteraction(TACTICAL_GUI, "command", { revision: data.state.revision, command: { type: "start" } });
        }
        return false;
      }, "the battle started by the server");
    });

    /** Sends a command from the HUD until the state shows it, with the latest revision the client holds (again if the server refused a stale one, as the HUD does). */
    const commandFromHud = (command: unknown, done: (state: any) => unknown, label: string) => {
      let sentAt = 0;
      return waitFor(() => {
        const data = hudData();
        if (data?.state && done(data.state)) return true;
        if (data && Date.now() - sentAt > 500) {
          sentAt = Date.now();
          inject(RpgGui).guiInteraction(TACTICAL_GUI, "command", { revision: data.state.revision, command });
        }
        return false;
      }, label);
    };

    test("draws the grid on the tiles of the map and hides the objects of the map until the battle ends", async () => {
      const server = await startMmorpgServer(battleModule(), [provideTacticalServer()]);
      const engine = await startClient(server.host, {}, [provideTestingLoadMap(), provideTacticalClient()]);
      const player = await waitFor(() => joinedPlayer("map-map1"), "the server player");
      await waitFor(() => localPlayerOn(engine, "map-map1"), "the local player");
      await waitFor(() => (engine as any).sceneMap?.events?.()?.guard, "the event of the map on the client");
      expect(engine.isMapObjectHidden("guard")).toBe(false);

      const battle = startTacticalBattle(player, "guard-room");
      const opening = await waitFor(() => hudData()?.state, "the tactical HUD");
      // The cells are the tiles of the map, the player's tile in the grid.
      const tile = Number((player.getCurrentMap() as any).tileWidth);
      expect(tile).toBeGreaterThan(0);
      expect(opening.board.cellSize).toBe(tile);
      expect(Math.abs(opening.board.origin.x % tile)).toBe(0);
      expect(Math.abs(opening.board.origin.y % tile)).toBe(0);
      // The fighter's screen hides the events and the players of the map.
      await waitFor(() => engine.isMapObjectHidden("guard"), "the event hidden");
      expect(engine.isMapObjectHidden(player.id)).toBe(true);

      // The heroes flee, the result screen is closed: the map shows its objects again, the HP is written on the player.
      await commandFromHud({ type: "start" }, (state) => state.started, "the battle started by the server");
      await commandFromHud({ type: "escape" }, (state) => state.winner, "the end of the battle");
      const hero = hudData().state.units.find((u: any) => u.player === player.id);
      inject(RpgGui).guiInteraction(TACTICAL_GUI, "close", {});
      await expect(battle).resolves.toMatchObject({ outcome: "escape" });
      await waitFor(() => !engine.isMapObjectHidden("guard"), "the event shown again");
      expect(engine.isMapObjectHidden(player.id)).toBe(false);
      expect(isInTacticalBattle(player)).toBe(false);
      expect(player.hp).toBe(hero.hp);
    });

    test("frees a player who disconnects during a battle", async () => {
      const server = await startMmorpgServer(battleModule(), [provideTacticalServer()]);
      const engine = await startClient(server.host, {}, [provideTestingLoadMap(), provideTacticalClient()]);
      const player = await waitFor(() => joinedPlayer("map-map1"), "the server player");
      await waitFor(() => localPlayerOn(engine, "map-map1"), "the local player");

      const battle = startTacticalBattle(player, "guard-room");
      await waitFor(() => hudData()?.state, "the tactical HUD");

      engine.disconnect();
      client = undefined;

      // The player left before the end, and is no longer busy.
      const result = await battle;
      expect(result.outcome).toBe("abandon");
      expect(isInTacticalBattle(player)).toBe(false);
    });
  });
});
