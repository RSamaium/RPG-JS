import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { testing, type TestingFixture } from "@rpgjs/testing";
import { Control, createModule, defineModule } from "@rpgjs/common";
import type { RpgEvent, RpgPlayer } from "@rpgjs/server";
import { createActionBattleServer } from "./server";
import { createActionEnemy } from "./enemies/factory";

const Bow = {
  id: "bow",
  name: "Bow",
  atk: 5,
  _type: "weapon" as const,
  attackProfile: { startupMs: 120, activeMs: 40, recoveryMs: 100 },
  action: {
    mode: "projectile" as const,
    range: 300,
    projectile: { type: "arrow", speed: 600, range: 300 },
  },
};

let fixture: TestingFixture;
let player: RpgPlayer;
const battle = createActionBattleServer();

beforeEach(async () => {
  const server = defineModule({
    database: async () => ({ bow: Bow }),
    maps: [{ id: "range-map", file: "", width: 640, height: 480 }],
    player: {
      async onConnected(p: RpgPlayer) {
        await p.changeMap("range-map", { x: 100, y: 100 });
      },
    },
  });
  fixture = await testing(createModule("RangedWeaponTest", [
    { server, client: defineModule({}) },
    { server: battle, client: defineModule({}) },
  ]));
  const client = await fixture.createClient();
  player = await client.waitForMapChange("range-map");
});

afterEach(async () => {
  await fixture.clear();
});

describe("ranged weapon in a real map", () => {
  test("an arrow hurts the enemy it hits and its AI reacts", async () => {
    const map = player.getCurrentMap()!;
    const id = await map.createDynamicEvent({
      id: "slime",
      x: 260,
      y: 100,
      event: {
        name: "Slime",
        onInit(this: RpgEvent) {
          createActionEnemy(this, { stats: { maxHp: 500, pdef: 0 } });
        },
      },
    });
    const slime = map.getEvent(id!)! as any;
    const handleDamage = vi.spyOn(slime.battleAi, "handleDamage");
    player.addItem("bow");
    player.equip("bow");
    player.changeDirection("right" as any);

    (battle as any).player.onInput(player, { action: Control.Action, data: { direction: "right" } });
    await new Promise((resolve) => setTimeout(resolve, 200));
    for (let i = 0; i < 60; i++) map.projectiles.step(1 / 60);

    // The AI is told about the hit: it shows the hurt feedback, staggers and can die.
    expect(handleDamage).toHaveBeenCalledTimes(1);
  });

  test("an arc shot aims at a switch in front of the player and lands on it", async () => {
    const map = player.getCurrentMap()!;
    const onProjectileHit = vi.fn(() => "stick");
    await map.createDynamicEvent({
      id: "lever",
      x: 260,
      y: 60,
      event: {
        name: "Lever",
        onProjectileHit(this: RpgEvent) {
          return onProjectileHit();
        },
      } as any,
    });
    (map as any).database().bow = {
      ...Bow,
      action: {
        ...Bow.action,
        projectile: {
          type: "arrow",
          trajectory: { type: "arc", range: 300, speed: 600 },
          landing: { radius: 12 },
        },
      },
    };
    player.addItem("bow");
    player.equip("bow");
    player.changeDirection("right" as any);

    (battle as any).player.onInput(player, { action: Control.Action, data: { direction: "right" } });
    await new Promise((resolve) => setTimeout(resolve, 200));
    for (let i = 0; i < 60; i++) map.projectiles.step(1 / 60);

    // The lever is above the line of sight: only an aimed shot reaches it.
    expect(onProjectileHit).toHaveBeenCalledTimes(1);
  });

  test("the basic attack releases a projectile that toggles a switch without damaging it", async () => {
    const map = player.getCurrentMap()!;
    const onProjectileHit = vi.fn(() => "stop");
    const id = await map.createDynamicEvent({
      id: "lever",
      x: 300,
      y: 100,
      event: {
        name: "Lever",
        onProjectileHit(this: RpgEvent, projectile: any) {
          return onProjectileHit(projectile.type);
        },
      } as any,
    });
    const lever = map.getEvent(id!)! as any;
    lever.hp = 50;
    player.addItem("bow");
    player.equip("bow");
    player.changeDirection("right" as any);
    const emit = vi.spyOn(map.projectiles, "emit");

    (battle as any).player.onInput(player, { action: Control.Action, data: { direction: "right" } });
    // The arrow leaves at the end of the attack startup, not on the key press.
    expect(emit).not.toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(emit).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 60; i++) map.projectiles.step(1 / 60);

    expect(onProjectileHit).toHaveBeenCalledWith("arrow");
    expect(lever.hp).toBe(50);
  });
});
