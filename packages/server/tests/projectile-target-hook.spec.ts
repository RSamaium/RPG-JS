import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { testing, type TestingFixture } from "@rpgjs/testing";
import { createModule, defineModule } from "@rpgjs/common";
import type { RpgEvent, RpgPlayer } from "../src";

let fixture: TestingFixture;
let player: RpgPlayer;
// What the module hook `event.onProjectileHit` returns in the current test.
let moduleReply: () => unknown = () => undefined;

beforeEach(async () => {
  const server = defineModule({
    maps: [{ id: "range-map", file: "", width: 640, height: 480 }],
    player: {
      async onConnected(p: RpgPlayer) {
        await p.changeMap("range-map", { x: 100, y: 100 });
      },
    },
    event: {
      onProjectileHit: () => moduleReply(),
    },
  });
  fixture = await testing(createModule("ProjectileTargetTest", [{ server, client: defineModule({}) }]));
  const client = await fixture.createClient();
  player = await client.waitForMapChange("range-map");
});

afterEach(async () => {
  moduleReply = () => undefined;
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

describe("a module hook replies to a projectile hitting an event", () => {
  async function shootAtCrate(own?: () => unknown) {
    const map = player.getCurrentMap()!;
    await map.createDynamicEvent({
      id: "crate",
      x: 300,
      y: 100,
      event: { name: "Crate", ...(own ? { onProjectileHit: own } : {}) } as any,
    });
    const onEnd = vi.fn();
    const impacts: unknown[] = [];
    const broadcast = vi.spyOn(map as any, "$broadcast").mockImplementation((message: any) => {
      if (message?.type === "projectile:impactBatch") impacts.push(...(message.value?.impacts ?? []));
    });
    map.projectiles.emit({
      type: "arrow",
      origin: { x: 160, y: 116 },
      direction: { x: 1, y: 0 },
      trajectory: { type: "linear", speed: 600, range: 300 },
      onEnd,
    }, player);
    for (let i = 0; i < 60; i++) map.projectiles.step(1 / 60);
    broadcast.mockRestore();
    return { onEnd, impacts };
  }

  test('"pass" lets the projectile fly through', async () => {
    moduleReply = () => "pass";
    const { onEnd } = await shootAtCrate();
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ reason: "range" }));
  });

  test("without a reply, the projectile stops on the event and plays its impact", async () => {
    const { onEnd, impacts } = await shootAtCrate();
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ reason: "hit" }));
    expect(impacts).toHaveLength(1);
  });

  test('"stick" plants the projectile: no impact is played', async () => {
    moduleReply = () => "stick";
    const { onEnd, impacts } = await shootAtCrate();
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ reason: "hit" }));
    expect(impacts).toHaveLength(0);
  });

  test("a reply from a promise does not decide", async () => {
    moduleReply = () => Promise.resolve("pass");
    const { onEnd } = await shootAtCrate();
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ reason: "hit" }));
  });

  test("the event's own onProjectileHit has the last word", async () => {
    moduleReply = () => "pass";
    const { onEnd } = await shootAtCrate(() => "stop");
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ reason: "hit" }));
  });
});
