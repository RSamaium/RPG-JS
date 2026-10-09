import { afterEach, expect, test } from "vitest";
import { testing, type TestingFixture } from "@rpgjs/testing";
import { defineModule, createModule } from "@rpgjs/common";
import type { RpgServer } from "../src";

let fixture: TestingFixture | undefined;

afterEach(async () => {
  await fixture?.clear();
  fixture = undefined;
});

test("onJoinMap can move the player out of a blocking event with findSpawnPosition", async () => {
  const server = defineModule<RpgServer>({
    maps: [
      {
        id: "map1",
        events: [{ event: { name: "Statue" }, x: 200, y: 200 }],
      },
    ],
    player: {
      async onConnected(player) {
        await player.changeMap("map1", { x: 200, y: 200 });
      },
      async onJoinMap(player, map) {
        const hitbox = player.hitbox();
        const spawn = map.findSpawnPosition({
          preferred: { x: player.x(), y: player.y() },
          hitbox: { width: hitbox.w, height: hitbox.h },
          z: player.z(),
          ignoreIds: [player.id],
          maxDistance: 256,
        });
        if (spawn) {
          await player.teleport(spawn);
        }
      },
    },
  });

  fixture = await testing(createModule("SpawnModule", [{ server, client: {} }]));
  const client = await fixture.createClient();
  const player = await client.waitForMapChange("map1");
  await fixture.wait(50);

  const statue = player.getCurrentMap()!.getEvents()[0];
  const overlapX = player.x() < statue.x() + 32 && player.x() + 32 > statue.x();
  const overlapY = player.y() < statue.y() + 32 && player.y() + 32 > statue.y();
  expect(overlapX && overlapY).toBe(false);
  expect(Math.hypot(player.x() - 200, player.y() - 200)).toBeLessThanOrEqual(64);
});
