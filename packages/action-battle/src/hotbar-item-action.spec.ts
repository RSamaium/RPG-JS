import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { testing, type TestingFixture } from "@rpgjs/testing";
import { createModule, defineModule } from "@rpgjs/common";
import { MAXHP, type RpgEvent, type RpgPlayer } from "@rpgjs/server";
import { ACTION_BATTLE_HOTBAR_USE, createActionBattleServer } from "./server";
import { createActionEnemy } from "./enemies/factory";

const Bomb = {
  id: "bomb",
  name: "Bomb",
  _type: "item" as const,
  action: {
    mode: "projectile" as const,
    projectile: {
      type: "bomb",
      trajectory: { type: "arc", range: 200, duration: 0.3, height: 40 },
    },
    area: { radius: 60 },
  },
};

const Boomerang = {
  id: "boomerang",
  name: "Boomerang",
  _type: "item" as const,
  consumable: false,
  action: {
    mode: "projectile" as const,
    projectile: {
      type: "boomerang",
      trajectory: { type: "return", speed: 400, range: 200 },
      pierce: true,
    },
  },
};

// Physical damage reads the attack of the equipped weapon.
const Sword = { id: "sword", name: "Sword", atk: 60, _type: "weapon" as const };

const Potion = { id: "potion", name: "Potion", _type: "item" as const, hpValue: 10 };

let fixture: TestingFixture;
let player: RpgPlayer;

beforeEach(async () => {
  const server = defineModule({
    maps: [{ id: "arena", file: "", width: 800, height: 600 }],
    database: { bomb: Bomb, boomerang: Boomerang, potion: Potion, sword: Sword },
    player: {
      async onConnected(p: RpgPlayer) {
        await p.changeMap("arena", { x: 100, y: 100 });
      },
    },
  });
  fixture = await testing(
    createModule("HotbarItemActionTest", [
      { server, client: defineModule({}) },
      { server: createActionBattleServer(), client: defineModule({}) },
    ])
  );
  const client = await fixture.createClient();
  player = await client.waitForMapChange("arena");
  player.initializeDefaultStats();
  player.addItem(Sword);
  player.equip("sword");
});

afterEach(async () => {
  await fixture.clear();
});

const spawnEnemy = async (id: string, x: number, y: number) => {
  const map = player.getCurrentMap()!;
  await map.createDynamicEvent({
    id,
    x,
    y,
    event: {
      name: id,
      onInit(this: RpgEvent) {
        createActionEnemy(this, { stats: { maxHp: 500 }, visionRange: 1 });
      },
    },
  });
  return map.getEvent(id)!;
};

const useSlot = (slot: number, target?: { x: number; y: number }) =>
  (player as any).execMethod("onInput", [{ action: ACTION_BATTLE_HOTBAR_USE, data: { slot, target } }]);

const run = (seconds: number) => {
  const map = player.getCurrentMap()!;
  for (let i = 0; i < Math.round(seconds * 60); i++) map.projectiles.step(1 / 60);
};

describe("items with an action in the hotbar", () => {
  test("a bomb is thrown at the aimed point, explodes on the area and is consumed", async () => {
    player.addItem(Bomb, 2);
    player.assignHotbarSlot(0, { type: "item", id: "bomb" });
    const near = await spawnEnemy("near", 260, 100);
    const far = await spawnEnemy("far", 600, 400);
    const emit = vi.spyOn(player.getCurrentMap()!.projectiles, "emit");

    await useSlot(0, { x: 276, y: 116 });
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "bomb",
        trajectory: expect.objectContaining({ type: "arc", range: expect.closeTo(160, 0) }),
      }),
      expect.anything()
    );
    expect(player.getItem("bomb")?.quantity()).toBe(1);

    run(0.5);
    expect(near.hp).toBeLessThan(500);
    expect(far.hp).toBe(500);
  });

  test("a non consumable boomerang stays in the inventory", async () => {
    player.addItem(Boomerang);
    player.assignHotbarSlot(1, { type: "item", id: "boomerang" });
    const enemy = await spawnEnemy("slime", 200, 100);

    await useSlot(1, { x: 400, y: 116 });
    run(1.5);
    expect(enemy.hp).toBeLessThan(500);
    expect(player.hasItem("boomerang")).toBe(true);
  });

  test("an item without action keeps the regular useItem behavior", async () => {
    player.addItem(Potion);
    player.assignHotbarSlot(2, { type: "item", id: "potion" });
    player.param[MAXHP] = 100;
    player.hp = 50;
    const emit = vi.spyOn(player.getCurrentMap()!.projectiles, "emit");

    await useSlot(2);
    expect(emit).not.toHaveBeenCalled();
    expect(player.hasItem("potion")).toBe(false);
  });
});
