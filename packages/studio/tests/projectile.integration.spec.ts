import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { testing, type TestingFixture } from "@rpgjs/testing";
import { createModule, defineModule } from "@rpgjs/common";
import type { RpgEvent, RpgPlayer } from "@rpgjs/server";
import { ACTION_BATTLE_HOTBAR_USE, createActionBattleServer } from "@rpgjs/action-battle/server";
import { createActionEnemy } from "@rpgjs/action-battle";
import { createStudioActionBattlePreset } from "../src/action-battle-audio";
import { normalizeStudioDatabase } from "../src/database-normalizer";
import { playStudioSkillVisualEffect } from "../src/skill-visual-effect";
import { launch_projectile } from "../runtime/blocks/executors/launch-projectile";
import { play_visual_effect } from "../runtime/blocks/executors/play-visual-effect";

// What the Studio stores: Projectiles, the item thrown with one, the Visual Effect it plays, and a weapon for the damage.
const database = normalizeStudioDatabase([
  { _id: "bomb", type: "projectile", name: "Bomb", trajectory: "bomb", range: 4, duration: 300, height: 40, areaRadius: 2, visualEffect: "boom" },
  { _id: "arrow", type: "projectile", name: "Arrow", trajectory: "straight", speed: 600, range: 8 },
  { _id: "bomb-item", type: "item", itemType: "item", name: "Bomb", consumable: true, throwProjectile: "bomb" },
  {
    _id: "boom",
    type: "visualEffect",
    name: "Boom",
    duration: 600,
    hitAt: 200,
    preset: { emitters: [{ burst: 2 }, { at: "target", burst: 12 }] },
  },
  { _id: "sword", type: "item", itemType: "weapon", name: "Sword", atk: 60 },
]);

let fixture: TestingFixture;
let player: RpgPlayer;

beforeEach(async () => {
  const server = defineModule({
    maps: [{ id: "arena", file: "", width: 800, height: 600 }],
    database,
    player: {
      async onConnected(p: RpgPlayer) {
        await p.changeMap("arena", { x: 100, y: 100 });
      },
    },
  });
  fixture = await testing(
    createModule("StudioProjectileTest", [
      { server, client: defineModule({}) },
      // The effects of the Studio preset (its hotbar reads the menus of a Studio project, absent here).
      { server: createActionBattleServer({ skills: createStudioActionBattlePreset().skills }), client: defineModule({}) },
    ]),
  );
  player = await (await fixture.createClient()).waitForMapChange("arena");
  player.initializeDefaultStats();
  player.addItem("sword");
  player.equip("sword");
});

afterEach(async () => {
  await fixture.clear();
});

const spawn = async (id: string, x: number, y: number, event: Record<string, unknown> = {}) => {
  const map = player.getCurrentMap()!;
  await map.createDynamicEvent({ id, x, y, event: { name: id, ...event } });
  return map.getEvent(id)! as RpgEvent;
};

const spawnEnemy = (id: string, x: number, y: number) =>
  spawn(id, x, y, {
    onInit(this: RpgEvent) {
      createActionEnemy(this, { stats: { maxHp: 500 }, visionRange: 1 });
    },
  });

const run = (seconds: number) => {
  const map = player.getCurrentMap()!;
  for (let i = 0; i < Math.round(seconds * 60); i++) map.projectiles.step(1 / 60);
};

describe("a Studio bomb thrown from the hotbar", () => {
  test("flies as its Projectile says, with its type, plays the start of its effect, explodes on its area and is used up", async () => {
    player.addItem("bomb-item", 2);
    player.assignHotbarSlot(0, { type: "item", id: "bomb-item" });
    const near = await spawnEnemy("near", 220, 100);
    const far = await spawnEnemy("far", 600, 400);
    const map = player.getCurrentMap()!;
    const emit = vi.spyOn(map.projectiles, "emit");
    const show = vi.spyOn(map, "showComponentAnimation");

    await (player as any).execMethod("onInput", [{ action: ACTION_BATTLE_HOTBAR_USE, data: { slot: 0, target: { x: 236, y: 116 } } }]);

    // The client draws it with the look registered for the type "bomb"
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "bomb",
        trajectory: expect.objectContaining({ type: "arc", height: 40 }),
        payload: expect.objectContaining({ projectileId: "bomb" }),
      }),
      expect.anything(),
    );
    // At launch, only what starts on the thrower
    expect(show).toHaveBeenCalledWith("rpg:visual-effect", expect.any(Object), expect.objectContaining({
      preset: expect.objectContaining({ emitters: [{ burst: 2 }] }),
    }));
    expect(player.getItem("bomb-item")?.quantity()).toBe(1);

    run(0.6);
    expect(near.hp).toBeLessThan(500);
    expect(far.hp).toBe(500);
  });
});

describe("a Studio skill with a Visual Effect", () => {
  test("plays it from the caster to the target, and its hit lands at the hitAt of the effect", async () => {
    const enemy = await spawnEnemy("slime", 300, 100);
    const show = vi.spyOn(player.getCurrentMap()!, "showComponentAnimation");

    const result = playStudioSkillVisualEffect({
      mode: "instant",
      attacker: player as any,
      target: enemy as any,
      action: {},
      visual: { effect: "boom" },
    });

    expect(result).toEqual({ hitDelayMs: 200 });
    const [, from, params] = show.mock.calls.find(([id]) => id === "rpg:visual-effect")!;
    const center = (entity: any) => ({ x: entity.x() + entity.hitbox().w / 2, y: entity.y() + entity.hitbox().h / 2 });
    expect(from).toEqual(center(player));
    // The client reads the target from where the effect starts
    expect((params as any).target).toEqual({ x: center(enemy).x - center(player).x, y: center(enemy).y - center(player).y });
    expect(playStudioSkillVisualEffect({ mode: "instant", attacker: player as any, action: {}, visual: { effect: "missing" } })).toBe(false);
  });
});

describe("the blocks of an event", () => {
  test("launch_projectile throws the arrow of the database at an event that reacts to it", async () => {
    const turret = await spawn("turret", 100, 300);
    const onProjectileHit = vi.fn(() => "stop");
    const target = await spawn("switch", 300, 300, { onProjectileHit });
    const map = player.getCurrentMap()!;
    const emit = vi.spyOn(map.projectiles, "emit");

    await launch_projectile({ player, event: turret, map } as any, { projectile: "arrow", source: "event", target: "event", targetEventId: "switch" });
    run(1);

    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ type: "arrow", trajectory: { type: "linear", speed: 600, range: 256 } }), turret);
    expect(onProjectileHit).toHaveBeenCalledWith(expect.objectContaining({ type: "arrow" }), expect.objectContaining({ owner: turret }));
    expect(target.getCurrentMap()).toBe(map);
  });

  test("launch_projectile takes HP from the player it hits, and does nothing for a record that is not a Projectile", async () => {
    const turret = await spawn("turret", 300, 100);
    player.hp = 100;
    const map = player.getCurrentMap()!;

    await launch_projectile({ player, event: turret, map } as any, { projectile: "arrow", source: "event", target: "player", damage: 30 });
    run(1);
    expect(player.hp).toBe(70);

    const emit = vi.spyOn(map.projectiles, "emit");
    await launch_projectile({ player, event: turret, map } as any, { projectile: "sword", source: "event" });
    expect(emit).not.toHaveBeenCalled();
  });

  test("play_visual_effect plays a Visual Effect from the player toward a position", async () => {
    const show = vi.spyOn(player.getCurrentMap()!, "showComponentAnimation");

    await play_visual_effect({ player, event: null, map: player.getCurrentMap() } as any, { effect: "boom", source: "player", target: "position", targetPosition: { x: 400, y: 116 } });

    expect(show).toHaveBeenCalledWith("rpg:visual-effect", expect.any(Object), expect.objectContaining({
      preset: { emitters: [{ burst: 2 }, { at: "target", burst: 12 }] },
      displayDuration: 600,
    }));
  });
});
