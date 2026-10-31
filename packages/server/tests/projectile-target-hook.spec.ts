import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { testing, type TestingFixture } from "@rpgjs/testing";
import { createModule, defineModule } from "@rpgjs/common";
import type { RpgEvent, RpgPlayer } from "../src";

let fixture: TestingFixture;
let player: RpgPlayer;

beforeEach(async () => {
  const server = defineModule({
    maps: [{ id: "range-map", file: "", width: 640, height: 480 }],
    player: {
      async onConnected(p: RpgPlayer) {
        await p.changeMap("range-map", { x: 100, y: 100 });
      },
    },
  });
  fixture = await testing(createModule("ProjectileTargetTest", [{ server, client: defineModule({}) }]));
  const client = await fixture.createClient();
  player = await client.waitForMapChange("range-map");
});

afterEach(async () => {
  await fixture.clear();
});

describe("onProjectileHit on a map event", () => {
  test("an object event reacts to a projectile and lets it through", async () => {
    const map = player.getCurrentMap()!;
    const onProjectileHit = vi.fn(() => "pass");
    await map.createDynamicEvent({
      id: "lever",
      x: 300,
      y: 100,
      event: {
        name: "Lever",
        onProjectileHit(this: RpgEvent, projectile: any) {
          return onProjectileHit(this.id, projectile.type);
        },
      } as any,
    });
    const onEnd = vi.fn();
    map.projectiles.emit({
      type: "arrow",
      origin: { x: 160, y: 116 },
      direction: { x: 1, y: 0 },
      trajectory: { type: "linear", speed: 600, range: 300 },
      onEnd,
    }, player);
    for (let i = 0; i < 60; i++) map.projectiles.step(1 / 60);

    expect(onProjectileHit).toHaveBeenCalledWith("lever", "arrow");
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ reason: "range" }));
  });
});
