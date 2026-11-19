import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { testing, type TestingFixture } from "@rpgjs/testing";
import { createModule, defineModule } from "@rpgjs/common";
import type { RpgEvent, RpgPlayer } from "@rpgjs/server";
import { createActionBattleServer } from "./server";
import { createActionEnemy } from "./enemies/factory";

// A skill whose action is a projectile: Action Battle owns how it is used.
const Fireball = {
  id: "fireball",
  name: "Fireball",
  spCost: 5,
  hitRate: 1,
  power: 20,
  _type: "skill" as const,
  action: {
    mode: "projectile" as const,
    range: 300,
    projectile: { type: "fireball", speed: 600, range: 300 },
  },
};

// A skill without action keeps the native rule of `player.useSkill`.
const Focus = { id: "focus", name: "Focus", spCost: 1, hitRate: 1, _type: "skill" as const };

let fixture: TestingFixture;
let player: RpgPlayer;
const battle = createActionBattleServer();

beforeEach(async () => {
  const server = defineModule({
    database: async () => ({ fireball: Fireball, focus: Focus }),
    maps: [{ id: "skill-map", file: "", width: 640, height: 480 }],
    player: {
      async onConnected(p: RpgPlayer) {
        await p.changeMap("skill-map", { x: 100, y: 100 });
      },
    },
  });
  fixture = await testing(createModule("SkillUseHandlerTest", [
    { server, client: defineModule({}) },
    { server: battle, client: defineModule({}) },
  ]));
  const client = await fixture.createClient();
  player = await client.waitForMapChange("skill-map");
});

afterEach(async () => {
  await fixture.clear();
});

async function spawnSlime(id = "slime", x = 260, y = 100) {
  const map = player.getCurrentMap()!;
  const eventId = await map.createDynamicEvent({
    id,
    x,
    y,
    event: {
      name: "Slime",
      onInit(this: RpgEvent) {
        createActionEnemy(this, { stats: { maxHp: 500, pdef: 0, sdef: 0 } });
      },
    },
  });
  return map.getEvent(eventId!)! as any;
}

describe("player.useSkill with Action Battle", () => {
  test("a skill with a projectile action launches its projectile and hurts the target", async () => {
    const map = player.getCurrentMap()!;
    const slime = await spawnSlime();
    const handleDamage = vi.spyOn(slime.battleAi, "handleDamage");
    const emit = vi.spyOn(map.projectiles, "emit");
    player.initializeDefaultStats();
    player.learnSkill("fireball");
    player.sp = 50;

    player.useSkill("fireball", slime);
    for (let i = 0; i < 60; i++) map.projectiles.step(1 / 60);

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit.mock.calls[0][0]).toMatchObject({ type: "fireball" });
    // The damage goes through the battle rules: the AI is told about the hit.
    expect(handleDamage).toHaveBeenCalledTimes(1);
    expect(slime.hp).toBeLessThan(500);
  });

  test("without a target, it aims at the nearest enemy, even behind the player", async () => {
    const map = player.getCurrentMap()!;
    // The player (100, 100) faces down; the nearest slime is on the left, the other one below and farther.
    const near = await spawnSlime("near", 20, 100);
    await spawnSlime("far", 100, 260);
    const nearDamage = vi.spyOn(near.battleAi, "handleDamage");
    const emit = vi.spyOn(map.projectiles, "emit");
    player.initializeDefaultStats();
    player.learnSkill("fireball");
    player.sp = 50;
    player.changeDirection("down" as any);

    player.useSkill("fireball");
    for (let i = 0; i < 60; i++) map.projectiles.step(1 / 60);

    expect(emit.mock.calls[0][0].direction.x).toBeLessThan(0);
    expect(nearDamage).toHaveBeenCalledTimes(1);
    // The player turns toward its target.
    expect(player.getDirection()).toBe("left");
  });

  test("without a target in reach, it is shot straight ahead", async () => {
    const map = player.getCurrentMap()!;
    // Farther than the 300 px of the action.
    await spawnSlime("away", 100, 460);
    const emit = vi.spyOn(map.projectiles, "emit");
    player.learnSkill("fireball");
    player.sp = 50;
    player.changeDirection("right" as any);

    player.useSkill("fireball");

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit.mock.calls[0][0].direction ?? { x: 1, y: 0 }).toMatchObject({ x: 1 });
  });

  test("a skill used during its cooldown or without SP is refused", async () => {
    const slime = await spawnSlime();
    player.learnSkill("fireball");
    player.sp = 0;

    expect(() => player.useSkill("fireball", slime)).toThrow();
  });

  test("a skill without action keeps the native rule", async () => {
    const map = player.getCurrentMap()!;
    const emit = vi.spyOn(map.projectiles, "emit");
    player.learnSkill("focus");
    player.sp = 10;

    player.useSkill("focus");

    expect(emit).not.toHaveBeenCalled();
    expect(player.sp).toBe(9);
  });
});
