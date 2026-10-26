import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { testing, TestingFixture } from "@rpgjs/testing";
import { createModule, defineModule } from "@rpgjs/common";
import { RpgMap, RpgPlayer } from "../src";
import { withDefaultDamageFormulas } from "../src/rooms/map-update-request";

// RSamaium/RPG-JS#421: a map room restored from storage never went through `/map/update`, so its
// `damageFormulas` stayed `{}` and a hit on a player threw "Physic Formulas not exists".
let player: RpgPlayer;
let fixture: TestingFixture;

const serverModule = defineModule({
  maps: [{ id: "test-map", file: "" }],
  player: {
    async onConnected(player) {
      await player.changeMap("test-map", { x: 100, y: 100 });
    },
  },
});

beforeEach(async () => {
  fixture = await testing(createModule("TestModule", [{ server: serverModule, client: defineModule({}) }]));
  const client = await fixture.createClient();
  player = await client.waitForMapChange("test-map");
});

afterEach(async () => {
  await fixture.clear();
});

describe("damage formulas of a map room", () => {
  test("a map that did not receive /map/update has the default formulas", () => {
    const room = (player.getCurrentMap() as any).partyRoom;
    const restored = new RpgMap(room);
    expect(typeof restored.damageFormulas.damagePhysic).toBe("function");
    expect(typeof restored.damageFormulas.damageSkill).toBe("function");
    expect(typeof restored.damageFormulas.damageCritical).toBe("function");
    expect(restored.damageFormulas.coefficientElements).toBeDefined();
  });

  test("a player of a map that did not receive /map/update resolves the default formulas", () => {
    const room = (player.getCurrentMap() as any).partyRoom;
    const restored = new RpgMap(room);
    const restoredPlayer = Object.create(player) as RpgPlayer;
    (restoredPlayer as any).getCurrentMap = () => restored;
    expect(typeof restoredPlayer.getFormulas("damagePhysic")).toBe("function");
    expect(typeof restoredPlayer.getFormulas("damageSkill")).toBe("function");
  });

  test("the formulas published with the map still win over the defaults", () => {
    const custom = () => 1;
    const map = player.getCurrentMap() as any;
    map.damageFormulas = withDefaultDamageFormulas({ damagePhysic: custom });
    expect(player.getFormulas("damagePhysic")).toBe(custom);
    expect(typeof player.getFormulas("damageSkill")).toBe("function");
  });
});
