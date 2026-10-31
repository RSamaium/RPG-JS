import { beforeEach, test, expect, afterEach, describe } from "vitest";
import { testing, TestingFixture } from "@rpgjs/testing";
import { defineModule, createModule } from "@rpgjs/common";
import { RpgPlayer, RpgServer } from "../src";
import { RpgClient } from "../../client/src";
import { createStatesSnapshotDeep } from "@signe/sync";

const serverModule = defineModule<RpgServer>({
  maps: [{ id: "map1" }],
  player: {
    async onConnected(player) {
      await player.changeMap("map1", { x: 100, y: 126 });
    },
  },
});

let player: RpgPlayer;
let map: any;
let fixture: TestingFixture;

async function createNpc(id: string, x = 160, y = 192) {
  await map.createDynamicEvent({
    id,
    x,
    y,
    event: { name: id, onInit() { this.setGraphic("hero"); } },
  });
  return map.getEvent(id);
}

beforeEach(async () => {
  fixture = await testing(createModule("SuspendModule", [{ server: serverModule, client: defineModule<RpgClient>({}) }]));
  const client = await fixture.createClient();
  player = await client.waitForMapChange("map1");
  map = player.getCurrentMap();
});

afterEach(() => {
  fixture.clear();
});

describe("suspending events", () => {
  test("a suspended event is hidden, without a hitbox, and kept", async () => {
    const npc = await createNpc("npc-1");
    expect(map.getBody("npc-1")).toBeDefined();

    expect(map.suspendEvents()).toContain("npc-1");

    expect(map.getEvent("npc-1")).toBeUndefined();
    expect(map.getEvents().map((e: any) => e.id)).not.toContain("npc-1");
    expect(createStatesSnapshotDeep(map).events?.["npc-1"]).toBeUndefined();
    expect(map.getBody("npc-1")).toBeUndefined();
    expect(map.isEventSuspended("npc-1")).toBe(true);
    expect(npc.suspended).toBe(true);
    expect(map.getSuspendedEvents()).toContain(npc);
  });

  test("resuming puts the event back with its position, graphics, variables and self switches", async () => {
    const npc = await createNpc("npc-2", 200, 224);
    npc.setVariable("quest", "started");
    npc.setGraphic("custom");
    npc.setSelfSwitch?.("A", true);

    map.suspendEvents();
    expect(map.resumeEvents()).toContain("npc-2");

    const back = map.getEvent("npc-2");
    expect(back).toBe(npc);
    expect(back.suspended).toBe(false);
    expect(back.x()).toBe(200);
    expect(back.y()).toBe(224);
    expect(back.graphics()).toEqual(["custom"]);
    expect(back.getVariable("quest")).toBe("started");
    if (back.getSelfSwitch) expect(back.getSelfSwitch("A")).toBe(true);
    const body = map.getBody("npc-2");
    expect(body).toBeDefined();
    // the body is back at the same place (the physics uses the center of the hitbox)
    expect(body.position.x - back.hitbox().w / 2).toBeCloseTo(200, 0);
    expect(body.position.y - back.hitbox().h / 2).toBeCloseTo(224, 0);
    expect(createStatesSnapshotDeep(map).events["npc-2"].graphics).toEqual(["custom"]);
  });

  test("a filter chooses which events are suspended and resumed", async () => {
    await createNpc("npc-a");
    await createNpc("chest-1", 224, 192);

    expect(map.suspendEvents((e: any) => e.id.startsWith("npc-"))).toEqual(["npc-a"]);
    expect(map.getEvent("chest-1")).toBeDefined();
    expect(map.suspendEvents()).toEqual(expect.arrayContaining(["chest-1"]));
    expect(map.resumeEvents((e: any) => e.id === "chest-1")).toEqual(["chest-1"]);
    expect(map.isEventSuspended("npc-a")).toBe(true);
    expect(map.getEvent("chest-1")).toBeDefined();
  });

  test("suspending twice, or resuming what is not suspended, does nothing", async () => {
    await createNpc("npc-3");
    expect(map.suspendEvent("npc-3")).toBe(true);
    expect(map.suspendEvent("npc-3")).toBe(false);
    expect(map.resumeEvent("npc-3")).toBe(true);
    expect(map.resumeEvent("npc-3")).toBe(false);
    expect(map.suspendEvent("unknown")).toBe(false);
  });

  test("event.suspend() and event.resume()", async () => {
    const npc = await createNpc("npc-4");
    expect(npc.suspend()).toBe(true);
    expect(npc.suspended).toBe(true);
    expect(npc.resume()).toBe(true);
    expect(npc.suspended).toBe(false);
    expect(map.getEvent("npc-4")).toBe(npc);
  });

  test("removing a suspended event forgets it for good", async () => {
    await createNpc("npc-5");
    map.suspendEvent("npc-5");
    map.removeEvent("npc-5");
    expect(map.isEventSuspended("npc-5")).toBe(false);
    expect(map.resumeEvents()).not.toContain("npc-5");
    expect(map.getEvent("npc-5")).toBeUndefined();
  });

  test("a scenario event is suspended for its owner and can be created again after it is resumed", async () => {
    const id = await map.createDynamicEvent(
      { id: "scenario-1", x: 160, y: 192, event: { name: "S" } },
      { mode: "scenario", scenarioOwnerId: player.id },
    );
    expect(map.getEventsForPlayer(player).map((e: any) => e.id)).toContain(id);

    map.suspendEvents();
    expect(map.getEventsForPlayer(player).map((e: any) => e.id)).not.toContain(id);

    map.resumeEvents();
    expect(map.getEventsForPlayer(player).map((e: any) => e.id)).toContain(id);
  });
});
