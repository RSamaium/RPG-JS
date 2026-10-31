import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { testing, type TestingFixture } from "@rpgjs/testing";
import { createModule, defineModule } from "@rpgjs/common";
import { isLootEvent, type RpgEvent, type RpgPlayer } from "@rpgjs/server";
import { createActionEnemy } from "./enemies/factory";

let fixture: TestingFixture;
let player: RpgPlayer;

beforeEach(async () => {
  const server = defineModule({
    maps: [{ id: "loot-map", file: "", width: 1024, height: 768 }],
    player: {
      async onConnected(p: RpgPlayer) {
        await p.changeMap("loot-map", { x: 100, y: 100 });
      },
    },
  });
  fixture = await testing(createModule("LootTest", [{ server, client: defineModule({}) }]));
  const client = await fixture.createClient();
  player = await client.waitForMapChange("loot-map");
});

afterEach(async () => {
  await fixture.clear();
});

describe("enemy loot in a real map", () => {
  test("pops pickups around the defeated enemy", async () => {
    const map = player.getCurrentMap()!;
    const id = await map.createDynamicEvent({
      id: "slime",
      x: 600,
      y: 400,
      event: {
        name: "Slime",
        onInit(this: RpgEvent) {
          createActionEnemy(this, { stats: { maxHp: 10 }, rewards: { gold: 10, drop: true } });
        },
      },
    });
    const slime = map.getEvent(id!)!;
    (slime as any).battleAi.handleDamage(player, { damage: 10, defeated: true });
    await new Promise((resolve) => setTimeout(resolve, 250));

    const loot = map.getEvents().filter(isLootEvent);
    expect(loot.length).toBeGreaterThan(0);
    for (const event of loot) {
      expect(Math.hypot(event.x() - 600, event.y() - 400)).toBeLessThan(90);
    }
  });
});
