import { afterEach, describe, expect, test } from "vitest";
import { h, Container } from "canvasengine";
import { testing, type TestingFixture } from "@rpgjs/testing";
import { defineModule } from "@rpgjs/common";
import {
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

@RpgRoom({ kind: "duel", path: "battle-{slug}" })
class AmbiguousBattleRoom extends RpgGameplayRoom {}

const serverModule = defineModule<RpgServer>({
  maps: [{ id: "start", file: "" }],
  player: {
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

    const battleChange = client.waitForRoomChange("battle");
    expect(await player.changeRoom({ kind: "battle", params: { id: "encounter-42" } })).toBe(true);
    player = await battleChange;
    await fixture.wait(0);

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

    expect(await player.changeMap("start", { x: 220, y: 240 })).toBe(true);
    await fixture.wait(200);
    player = client.player;
    expect(player.getCurrentMap()?.id).toBe("start");
    expect(player.id).toBe(playerId);
    expect(player.x()).toBe(220);
    expect(player.y()).toBe(240);
    expect(player.getVariable("transfer-proof")).toBe("preserved");
    expect(client.client.activeSceneKind()).toBe("map");
  });
});
