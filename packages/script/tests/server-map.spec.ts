import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createModule, defineModule } from "@rpgjs/common";
import type { RpgPlayer, RpgServer } from "@rpgjs/server";
import { testing, type TestingFixture } from "@rpgjs/testing";
import { provideScripts, type ScriptSource } from "../src/server";

let fixture: TestingFixture | undefined;
// the scripts of an earlier `testing()` still run in the next one: every test writes to names of its own
let n = 0;
beforeEach(() => { n++; });
afterEach(async () => {
  await fixture?.clear();
  fixture = undefined;
  vi.restoreAllMocks();
});

const serverModule = defineModule<RpgServer>({
  maps: [{ id: "town", file: "" }],
  events: [],
  player: {
    async onConnected(p) {
      await p.changeMap("town", { x: 100, y: 100 });
    },
  },
});

async function start(scripts: ScriptSource[]) {
  fixture = await testing(createModule("MapApiTest", [{ server: serverModule, client: defineModule({}) }]), {}, { providers: [provideScripts({ scripts })] });
  const player: RpgPlayer = await (await fixture.createClient()).waitForMapChange("town");
  return { player, map: player.getCurrentMap()! };
}

const settled = (check: () => void) => vi.waitFor(check, { timeout: 2000, interval: 10 });

describe("$map on a real map", () => {
  it("creates an event on the map, with its name, which the players then act on and touch", async () => {
    const { player, map } = await start([
      { id: "maker", source: `on("player.joinMap", () => { $map.createDynamicEvent({ id: "shop_${n}", x: 150, y: 100, name: "shop_${n}", hitbox: { width: 40, height: 40 } }); });` },
      { id: "shop", source: `on("event.action", { where: { "event.name": "shop_${n}" } }, () => { $player.setVariable("shopped_${n}", true); });` },
    ]);
    await settled(() => expect(map.getEvent(`shop_${n}`)).toBeDefined());

    await map.getEvent(`shop_${n}`)!.execMethod("onAction", [player, { action: "action" }]);

    expect(player.getVariable(`shopped_${n}`)).toBe(true);
    const name = (map.getEvent(`shop_${n}`) as any).name;
    expect(typeof name === "function" ? name() : name).toBe(`shop_${n}`);
  });

  it("finds and lists the events, and removes the ones it made", async () => {
    const { player, map } = await start([{
      id: "keeper",
      source: `on("player.levelUp", () => {
        const id = $map.createDynamicEvent({ id: "temp_${n}", x: 200, y: 100, name: "temp" });
        const found = $map.getEvent(id);
        const listed = $map.getEvents().map((e) => e.id).includes(id);
        const removed = $map.removeEvent(id);
        $player.setVariable("kept_${n}", [found.name, listed, removed, $map.getEvent(id) === undefined]);
      });`,
    }]);

    player.level = player.level + 1;

    await settled(() => expect(player.getVariable(`kept_${n}`)).toEqual(["temp", true, true, true]));
    expect(map.getEvent(`temp_${n}`)).toBeUndefined();
  });

  it("does not remove an event of the game", async () => {
    const { player, map } = await start([{ id: "thief", source: `on("player.levelUp", () => { $player.setVariable("removed_${n}", $map.removeEvent("old-man_${n}")); });` }]);
    await map.createDynamicEvent({ id: `old-man_${n}`, x: 300, y: 100, event: { name: "old man" } as any });

    player.level = player.level + 1;

    await settled(() => expect(player.getVariable(`removed_${n}`)).toBe(false));
    expect(map.getEvent(`old-man_${n}`)).toBeDefined();
  });

  it("reads the events and the players of the map", async () => {
    const { player, map } = await start([{
      id: "reader",
      source: `on("player.levelUp", () => { $player.setVariable("seen_${n}", [$map.id, $map.getPlayers().map((p) => p.id).includes($event.id || "none") , $map.getPlayers().length, $map.getEvent("npc_${n}")?.name]); });`,
    }]);
    await map.createDynamicEvent({ id: `npc_${n}`, x: 300, y: 100, event: { name: "old man" } as any });

    player.level = player.level + 1;

    await settled(() => expect(player.getVariable(`seen_${n}`)).toEqual(["town", false, 1, "old man"]));
  });

  it("keeps variables on the map, apart from the ones of the player", async () => {
    const { player, map } = await start([{ id: "gate", source: `on("player.levelUp", () => { $map.setVariable("gate_${n}", "open"); $player.setVariable("mine_${n}", $map.getVariable("gate_${n}")); });` }]);

    player.level = player.level + 1;

    await settled(() => expect(map.getVariable(`gate_${n}`)).toBe("open"));
    expect(player.getVariable(`mine_${n}`)).toBe("open");
    expect(player.hasVariable(`gate_${n}`)).toBe(false);
  });

  it("stops a script that makes events without end, and reports it", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { player, map } = await start([{ id: "flood", source: `on("player.levelUp", () => { for (let i = 0; i < 80; i += 1) { $map.createDynamicEvent({ id: "f${n}_" + i, x: i, y: 0 }); } });` }]);

    player.level = player.level + 1;

    await settled(() => expect(error).toHaveBeenCalled());
    expect(map.getEvents().filter((event) => event.id.startsWith(`f${n}_`)).length).toBe(50);
  });
});
