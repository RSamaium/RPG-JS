import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createModule, defineModule } from "@rpgjs/common";
import { EventData, RpgEvent, type RpgPlayer, type RpgServer } from "@rpgjs/server";
import { testing, type TestingFixture } from "@rpgjs/testing";
import { GAME_SIGNALS } from "../src/game/signals";
import { provideScripts, type ScriptSource } from "../src/server";

const Relic = { id: "Relic", name: "Relic", _type: "item" as const, tags: ["relic", "quest"] };
const Potion = { id: "Potion", name: "Potion", hpValue: 10, consumable: true, _type: "item" as const };
const Fireball = { id: "Fireball", name: "Fireball", spCost: 0, _type: "skill" as const, tags: ["fire"] };

@EventData({ name: "villager", tags: ["help", "villager"] })
class VillagerEvent extends RpgEvent {}

let fixture: TestingFixture | undefined;
// RPGJS keeps the hooks of an earlier `testing()` alive in the next one: every test writes to variables of its own
let n = 0;
beforeEach(() => { n++; });
afterEach(async () => {
  await fixture?.clear();
  fixture = undefined;
});
const settled = (check: () => void) => vi.waitFor(check, { timeout: 2000, interval: 10 });
/** A variable a script built from another one it read back, as plain data: the sandbox gives arrays of its own. */
const plain = (value: unknown) => JSON.parse(JSON.stringify(value ?? null));

/** A real game whose map is tagged `town`, as a Studio game tags it (in the data of the map), running the given scripts. */
async function start(scripts: ScriptSource[]) {
  const server = defineModule<RpgServer>({
    maps: [{ id: "town-map", file: "" }],
    database: { Relic, Potion, Fireball },
    map: {
      onBeforeUpdate(mapData: any) {
        mapData.tags = ["town", "safe"];
      },
    },
    player: {
      async onConnected(player: RpgPlayer) {
        await player.changeMap("town-map", { x: 100, y: 100 });
      },
    },
  });
  fixture = await testing(createModule("SignalTags", [{ server }]), {}, { providers: [provideScripts({ scripts })] });
  const client = await fixture.createClient();
  const player: RpgPlayer = await client.waitForMapChange("town-map");
  return { player, map: player.getCurrentMap()! };
}

describe("the tags of events, maps and records in the signals", () => {
  it("runs event.action for an event that has the tag, whatever its name, and not for an event without it", async () => {
    const { player, map } = await start([{
      id: "reputation",
      source: `on("event.action", { where: { "event.tags": { has: "help" } } }, (e) => { $player.setVariable("helped_${n}", [...($player.getVariable("helped_${n}") ?? []), e.event.name]); $player.setVariable("tags_${n}", e.event.tags); });`,
    }]);
    const villager = (await map.createDynamicEvent({ id: "npc-1", x: 150, y: 100, event: { name: "Aider un PNJ", tags: ["help", "villager", "help"] } as any }))!;
    const renamed = (await map.createDynamicEvent({ id: "npc-2", x: 200, y: 100, event: { name: "Another helper", tags: ["help"] } as any }))!;
    const guard = (await map.createDynamicEvent({ id: "npc-3", x: 250, y: 100, event: { name: "Aider un PNJ" } as any }))!;

    await map.getEvent(guard)!.execMethod("onAction", [player, { action: "action" }]);
    await map.getEvent(villager)!.execMethod("onAction", [player, { action: "action" }]);
    await map.getEvent(renamed)!.execMethod("onAction", [player, { action: "action" }]);

    await settled(() => expect(plain(player.getVariable(`helped_${n}`))).toEqual(["Aider un PNJ", "Another helper"]));
    // Each tag once
    expect(plain(player.getVariable(`tags_${n}`))).toEqual(["help"]);
    expect(map.getEvent(villager)!.tags).toEqual(["help", "villager"]);
    expect(map.getEvent(guard)!.tags).toEqual([]);
  });

  it("gives the tags of an event class (@EventData) and an empty list for an event with none", async () => {
    const { player, map } = await start([{
      id: "touch",
      source: `on("event.touch", (e) => { $player.setVariable("touched_${n}", [...($player.getVariable("touched_${n}") ?? []), e.event.tags]); });`,
    }]);
    const villager = (await map.createDynamicEvent({ id: "villager-1", x: 150, y: 100, event: VillagerEvent }))!;
    const rock = (await map.createDynamicEvent({ id: "rock-1", x: 200, y: 100, event: { name: "rock", onPlayerTouch() {} } as any }))!;

    await map.getEvent(villager)!.execMethod("onPlayerTouch", [player]);
    await map.getEvent(rock)!.execMethod("onPlayerTouch", [player]);

    await settled(() => expect(plain(player.getVariable(`touched_${n}`))).toEqual([["help", "villager"], []]));
  });

  it("gives the tags of the item in player.itemAdd, and filters on them", async () => {
    const { player } = await start([{
      id: "relics",
      source: `
        on("player.itemAdd", { where: { itemTags: { has: "relic" } } }, (e) => { $player.setVariable("relic_${n}", [e.item, e.itemTags]); });
        on("player.itemAdd", { where: { item: "Potion" } }, (e) => { $player.setVariable("potion_${n}", e.itemTags); });
      `,
    }]);

    player.addItem("Potion", 1);
    player.addItem("Relic", 1);

    await settled(() => {
      expect(player.getVariable(`relic_${n}`)).toEqual(["Relic", ["relic", "quest"]]);
      expect(player.getVariable(`potion_${n}`)).toEqual([]);
    });
  });

  it("gives the tags of the map in player.joinMap and player.joinRoom", async () => {
    // The scripts are installed before the player connects: they see the first map the player enters
    const { player } = await start([{
      id: "towns",
      source: `
        on("player.joinMap", { where: { mapTags: { has: "town" } } }, (e) => { $player.setVariable("town_${n}", e.mapTags); });
        on("player.joinRoom", { where: { kind: "map" } }, (e) => { $player.setVariable("room_${n}", e.mapTags); });
      `,
    }]);

    await settled(() => {
      expect(player.getVariable(`town_${n}`)).toEqual(["town", "safe"]);
      expect(player.getVariable(`room_${n}`)).toEqual(["town", "safe"]);
    });
  });

  it("gives the tags of the skill in player.skillChange", async () => {
    const { player } = await start([{
      id: "fire",
      source: `on("player.skillChange", { where: { skillTags: { has: "fire" } } }, (e) => { $player.setVariable("learned_${n}", [e.action, e.skill, e.skillTags]); });`,
    }]);

    player.learnSkill("Fireball");

    await settled(() => expect(player.getVariable(`learned_${n}`)).toEqual(["learn", "Fireball", ["fire"]]));
  });

  it("describes the new fields to the scripts and the Studio agent", () => {
    expect(GAME_SIGNALS["event.action"].payload.event.fields?.tags?.type).toBe("string[]");
    expect(GAME_SIGNALS["event.touch"].payload.event.fields?.tags?.type).toBe("string[]");
    for (const signal of ["player.joinMap", "player.leaveMap", "player.joinRoom", "player.leaveRoom"]) {
      expect(GAME_SIGNALS[signal].payload.mapTags?.type, signal).toBe("string[]");
    }
    for (const signal of ["player.itemAdd", "player.itemRemove", "player.itemUse", "player.itemEquip"]) {
      expect(GAME_SIGNALS[signal].payload.itemTags?.type, signal).toBe("string[]");
    }
    expect(GAME_SIGNALS["player.skillChange"].payload.skillTags?.type).toBe("string[]");
  });
});
