import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Container, h } from "canvasengine";
import { defineModule } from "@rpgjs/common";
import { provideServerRooms, RpgGameplayRoom, RpgRoom, type RpgPlayer, type RpgServer } from "@rpgjs/server";
import { provideClientScenes, type RpgClient } from "@rpgjs/client";
import { testing, type TestingFixture } from "@rpgjs/testing";
import { provideScripts, SHARED_PREFIX, type ScriptSource } from "../src/server";

@RpgRoom({ kind: "battle", path: "battle-{id}", initialState: () => ({ turn: 1 }) })
class BattleRoom extends RpgGameplayRoom<{ turn: number }> {}

@RpgRoom({ kind: "table", path: "table-{id}" })
class TableRoom extends RpgGameplayRoom<{ seats: number }> {}

const serverModule = defineModule<RpgServer>({ maps: [{ id: "start", file: "" }] });
const clientModule = defineModule<RpgClient>({});
const scene = (kind: string) => ({ kind, component: () => h(Container) });

let fixture: TestingFixture | undefined;
// the scripts of an earlier `testing()` still run in the next one: every test writes to variables of its own
let n = 0;
beforeEach(() => { n++; });
afterEach(async () => {
  await fixture?.clear();
  fixture = undefined;
  vi.restoreAllMocks();
});

/** A real server with a map and two kinds of gameplay room, and a client that is in the map. */
async function start(scripts: ScriptSource[]) {
  fixture = await testing(
    [{ server: serverModule, client: clientModule }],
    { providers: [provideClientScenes([scene("battle"), scene("table")])] },
    { providers: [provideServerRooms([BattleRoom, TableRoom]), provideScripts({ scripts })] },
  );
  const client = await fixture.createClient();
  await client.player.changeMap("start", { x: 100, y: 100 });
  await fixture.wait(200);
  return {
    client,
    inMap: (): RpgPlayer => client.player,
    async goTo(kind: string, id: string): Promise<RpgPlayer> {
      const arrived = client.waitForRoomChange(kind);
      expect(await client.player.changeRoom({ kind, params: { id } })).toBe(true);
      const player = await arrived;
      await fixture!.wait(50);
      return player;
    },
  };
}

const settled = (check: () => void) => vi.waitFor(check, { timeout: 2000, interval: 10 });

describe("scripts in a room that is not a map", () => {
  it("run for the signals of the player that do not need a map: a level up in a battle room", async () => {
    const game = await start([{ id: "levels", source: `on("player.levelUp", (e) => { $player.setVariable("gained_${n}", e.gained); $player.gold += 10 * e.gained; });` }]);
    const player = await game.goTo("battle", "encounter-1");
    expect(player.getCurrentMap()).toBeNull();
    player.gold = 0;

    player.level = player.level + 2;

    await settled(() => expect(player.getVariable(`gained_${n}`)).toBe(2));
    expect(player.gold).toBe(20);
  });

  it("run when a player has no health left in a battle room", async () => {
    const game = await start([{ id: "deaths", source: `on("player.dead", () => { $player.setVariable("dead_${n}", true); });` }]);
    const player = await game.goTo("battle", "encounter-2");

    player.hp = 0;

    await settled(() => expect(player.getVariable(`dead_${n}`)).toBe(true));
  });

  it("know the room they run in: $room.kind and $room.id, for a map and for a gameplay room", async () => {
    const source = `on("player.joinRoom", (e) => { $player.setVariable("room_${n}_" + e.kind, [$room.kind, $room.id, e.id]); });`;
    const game = await start([{ id: "rooms", source }]);
    await settled(() => expect(game.inMap().getVariable(`room_${n}_map`)).toEqual(["map", "start", "start"]));

    const player = await game.goTo("battle", "encounter-3");

    await settled(() => expect(player.getVariable(`room_${n}_battle`)).toEqual(["battle", "battle-encounter-3", "battle-encounter-3"]));
  });

  it("say when a player leaves a room", async () => {
    const game = await start([{ id: "leave", source: `on("player.leaveRoom", { where: { kind: "map" } }, (e) => { $player.setVariable("left_${n}", e.id); });` }]);
    const inMap = game.inMap();
    const connection = inMap.conn!;

    await game.goTo("battle", "encounter-4");
    connection.close(); // RPGJS leaves the map when the connection of the map closes, as the transfer does

    await settled(() => expect(inMap.getVariable(`left_${n}`)).toBe("start"));
  });

  it("filter on the kind of room", async () => {
    const game = await start([{ id: "only-battles", source: `on("player.joinRoom", { where: { kind: "battle" } }, () => { $player.setVariable("battle_${n}", true); });` }]);

    const table = await game.goTo("table", "t1");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(table.getVariable(`battle_${n}`)).toBeUndefined();
  });

  it("share a property in the state of the room, which the clients receive", async () => {
    const game = await start([{
      id: "turns",
      source: `shared({ turns: { initial: 0, client: true } }); on("player.levelUp", () => { $shared.turns += 1; });`,
    }]);
    const player = await game.goTo("battle", "encounter-5");
    const room = player.getCurrentRoom<BattleRoom>()!;

    player.level = player.level + 1;
    player.level = player.level + 1;

    await settled(() => expect((room.state() as Record<string, unknown>)[SHARED_PREFIX + "turns"]).toBe(2));
    expect(room.state()).toMatchObject({ turn: 1 });
  });

  it("share a property in a room that was declared without an initial state", async () => {
    const game = await start([{ id: "seats", source: `shared({ seats: { initial: 4 } }); on("player.levelUp", () => { $shared.seats -= 1; });` }]);
    const player = await game.goTo("table", "t2");
    const room = player.getCurrentRoom<TableRoom>()!;

    player.level = player.level + 1;

    await settled(() => expect((room.state() as Record<string, unknown>)[SHARED_PREFIX + "seats"]).toBe(3));
  });
});
