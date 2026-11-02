import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { h, Container } from "canvasengine";
import { testing, type TestingFixture } from "@rpgjs/testing";
import {
  defineModule,
  getMapChunkKey,
  MAP_VIEW_EVENT,
  MAP_VIEW_REQUEST_EVENT,
  type MapStreamDefinition,
  type MapStreamPacket,
} from "@rpgjs/common";
import {
  provideServerMapStreaming,
  provideServerRooms,
  RpgGameplayRoom,
  RpgRoom,
  RpgRoomAction,
  RpgRoomRegistry,
  type RpgPlayer,
  type RpgServer,
} from "../src";
import {
  provideClientScenes,
  RpgClientRoom,
  type RpgClient,
} from "../../client/src";

type BattleState = {
  turn: number;
  lastPlayerId: string | null;
};

@RpgRoom<BattleState>({
  kind: "battle",
  path: "battle-{id}",
  persistState: true,
  initialState: () => ({ turn: 1, lastPlayerId: null }),
})
class BattleRoom extends RpgGameplayRoom<BattleState> {
  @RpgRoomAction("battle.nextTurn")
  nextTurn(player: RpgPlayer): void {
    this.state.update((state) => ({
      turn: state.turn + 1,
      lastPlayerId: player.id,
    }));
  }
}

@RpgRoom({
  kind: "arena",
  path: "arena-{id}",
  map: (params) => params.id.split("__")[0],
})
class ArenaRoom extends RpgGameplayRoom {}

function compileTestMap(mapId: string): MapStreamDefinition {
  const chunks = Object.fromEntries([0, 1].map((x) => {
    const key = getMapChunkKey(x, 0);
    return [key, {
      key,
      x,
      y: 0,
      bounds: { x: x * 100, y: 0, width: 100, height: 100 },
      renderData: { tile: x },
      hitboxes: [{ x: x * 100, y: 0, width: 10, height: 10 }],
    }];
  }));
  return {
    manifest: {
      protocol: 1,
      mapId,
      revision: "one",
      width: 200,
      height: 100,
      chunkWidth: 100,
      chunkHeight: 100,
      columns: 2,
      rows: 1,
      renderData: {},
    },
    chunks,
  };
}

@RpgRoom({ kind: "duel", path: "battle-{slug}" })
class AmbiguousBattleRoom extends RpgGameplayRoom {}

const onDisconnected = vi.fn();

const serverModule = defineModule<RpgServer>({
  maps: [{ id: "start", file: "" }],
  player: {
    onDisconnected,
    onConnected(player) {
      player.setVariable("transfer-proof", "preserved");
    },
    onJoinMap(player) {
      player.setVariable("transfer-proof", "preserved");
    },
  },
});

const clientModule = defineModule<RpgClient>({});

describe("custom gameplay rooms", () => {
  let fixture: TestingFixture | undefined;

  beforeEach(() => onDisconnected.mockClear());

  afterEach(async () => {
    await fixture?.clear();
    fixture = undefined;
  });

  test("client room state signal", () => {
    const room = new RpgClientRoom<BattleState>();
    room.state.set({ turn: 1, lastPlayerId: null });
    expect(room.state()).toEqual({ turn: 1, lastPlayerId: null });
  });

  test("registry resolves declared paths and rejects invalid registrations", () => {
    const registry = new RpgRoomRegistry([BattleRoom]);
    expect(registry.describe({ kind: "battle", params: { id: "encounter-42" } })).toEqual({
      id: "battle-encounter-42",
      kind: "battle",
      name: "encounter-42",
    });
    expect(registry.describeId("battle-encounter-42")).toEqual({
      id: "battle-encounter-42",
      kind: "battle",
      name: "encounter-42",
    });
    expect(() => registry.describe({ kind: "missing" })).toThrow("Unknown RPGJS room kind");
    expect(() => registry.describe({ kind: "battle", params: { id: "bad/path" } })).toThrow("Invalid parameter id");
    expect(() => new RpgRoomRegistry([BattleRoom, BattleRoom])).toThrow("Duplicate RPGJS room kind");
    expect(() => new RpgRoomRegistry([BattleRoom, AmbiguousBattleRoom])).toThrow("Duplicate RPGJS room path");
    expect(() => RpgRoom({ kind: "Invalid Kind", path: "invalid-{id}" })).toThrow("Invalid RPGJS room kind");
  });

  test("map room serves its visual stream without hitboxes, and the room names its map", async () => {
    const compile = vi.fn((mapData: { id: string }) => compileTestMap(String(mapData.id).replace(/^map-/, "")));
    fixture = await testing(
      [{ server: serverModule, client: clientModule }, { server: provideServerMapStreaming({ compile }) }],
      { providers: [provideClientScenes([{ kind: "arena", component: () => h(Container) }])] },
      { providers: [provideServerRooms([ArenaRoom])] },
    );
    const client = await fixture.createClient();
    expect(await client.player.changeMap("start", { x: 100, y: 100 })).toBe(true);
    await fixture.wait(200);

    // The route a gameplay room calls through the room-to-room channel in MMORPG mode.
    const map = client.player.getCurrentMap() as any;
    const response = await map.mapView(new Request("http://localhost/parties/main/map-start/map/view"));
    expect(response).toMatchObject({ mapId: "start", revision: "one", manifest: { mapId: "start" }, removed: [] });
    expect(response.chunks.map((chunk: { key: string }) => chunk.key)).toEqual(["0:0", "1:0"]);
    expect(response.chunks.every((chunk: { hitboxes: unknown[] }) => chunk.hitboxes.length === 0)).toBe(true);

    const arenaChange = client.waitForRoomChange("arena");
    expect(await client.player.changeRoom({ kind: "arena", params: { id: "start__battle" } })).toBe(true);
    const player = await arenaChange;
    await fixture.wait(0);
    expect(player.getCurrentRoom<ArenaRoom>()?.mapId).toBe("start");
    expect(player.getCurrentMap()).toBeNull();
    const compilations = compile.mock.calls.length;

    // A client that loads its maps itself only asks the room which map it shows.
    const packet = await new Promise<MapStreamPacket>((resolve) => {
      const listener = (value: MapStreamPacket) => {
        client.client.socket.off(MAP_VIEW_EVENT, listener);
        resolve(value);
      };
      client.client.socket.on(MAP_VIEW_EVENT, listener);
      client.client.socket.emit(MAP_VIEW_REQUEST_EVENT, { local: true });
    });
    expect(packet).toEqual({ mapId: "start", revision: "", chunks: [], removed: [] });
    expect(compile.mock.calls.length).toBe(compilations);
  });

  test("transfers one player map -> battle -> map and hydrates authoritative state", async () => {
    let lastRoomSync: unknown;
    let lastRoomState: unknown;
    let lastRoomRef: unknown;
    fixture = await testing(
      [{ server: serverModule, client: clientModule }],
      {
        providers: [
          provideClientScenes([{
            kind: "battle",
            component: () => h(Container),
            onChanges(room, partial) {
              lastRoomRef = room;
              lastRoomSync = partial;
              lastRoomState = room.state();
            },
          }]),
        ],
      },
      {
        providers: [provideServerRooms([BattleRoom])],
      },
    );
    const client = await fixture.createClient();
    const lobbyPlayer = client.player;
    expect(await lobbyPlayer.changeMap("start", { x: 100, y: 100 })).toBe(true);
    await fixture.wait(200);
    let player = client.player;
    expect(player.getCurrentMap()?.id).toBe("start");
    const playerId = player.id;
    expect(player.getVariable("transfer-proof")).toBe("preserved");
    expect(player.snapshot?.()).toMatchObject({ variables: { "transfer-proof": "preserved" } });

    const sourceMapConnection = player.conn!;
    const battleChange = client.waitForRoomChange("battle");
    expect(await player.changeRoom({ kind: "battle", params: { id: "encounter-42" } })).toBe(true);
    player = await battleChange;
    await fixture.wait(0);

    sourceMapConnection.close();
    await fixture.wait(50);
    expect(onDisconnected).not.toHaveBeenCalled();
    const room = player.getCurrentRoom<BattleRoom>();
    expect(player.snapshot?.()).toMatchObject({ variables: { "transfer-proof": "preserved" } });
    expect(player.id).toBe(playerId);
    expect(player.getCurrentMap()).toBeNull();
    expect(player.getVariable("transfer-proof")).toBe("preserved");
    expect(room?.state()).toEqual({ turn: 1, lastPlayerId: null });
    expect(room?.descriptor).toEqual({
      id: "battle-encounter-42",
      kind: "battle",
      name: "encounter-42",
    });
    expect(room?.params).toEqual({ id: "encounter-42" });
    expect(client.client.activeSceneKind()).toBe("battle");
    expect(client.client.getCurrentRoom()).toBe(client.client.sceneRoom);
    expect(lastRoomRef).toBe(client.client.sceneRoom);
    expect(lastRoomSync).toMatchObject({ state: { turn: 1, lastPlayerId: null } });
    expect(client.client.sceneRoom.state()).toEqual({ turn: 1, lastPlayerId: null });
    expect(lastRoomState).toEqual({ turn: 1, lastPlayerId: null });
    expect(client.client.sceneRoom.players()[playerId].constructor.name).toBe("RpgClientPlayer");
    expect(client.client.sceneRoom.players()[playerId].id).toBe(playerId);

    client.client.socket.emit("battle.nextTurn", {});
    await fixture.wait(0);
    expect(room?.state()).toEqual({ turn: 2, lastPlayerId: playerId });
    room?.$applySync();
    await fixture.wait(0);
    expect(client.client.sceneRoom.state()).toEqual({ turn: 2, lastPlayerId: playerId });

    const sourceBattleConnection = player.conn!;
    expect(await player.changeMap("start", { x: 220, y: 240 })).toBe(true);
    await fixture.wait(200);
    player = client.player;
    expect(player.getCurrentMap()?.id).toBe("start");
    expect(player.id).toBe(playerId);
    expect(player.x()).toBe(220);
    expect(player.y()).toBe(240);
    expect(player.getVariable("transfer-proof")).toBe("preserved");
    expect(client.client.activeSceneKind()).toBe("map");
    sourceBattleConnection.close();
    await fixture.wait(50);
    expect(onDisconnected).not.toHaveBeenCalled();

    const battleAgain = client.waitForRoomChange("battle");
    await player.changeRoom({ kind: "battle", params: { id: "another" } });
    player = await battleAgain;
    player.conn!.close();
    await vi.waitFor(() => expect(onDisconnected).toHaveBeenCalledOnce());
  });
});
