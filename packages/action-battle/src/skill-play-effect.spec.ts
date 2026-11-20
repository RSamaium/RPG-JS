import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { testing, type TestingFixture } from "@rpgjs/testing";
import { createModule, defineModule } from "@rpgjs/common";
import type { RpgEvent, RpgPlayer } from "@rpgjs/server";
import { ACTION_BATTLE_HOTBAR_USE, createActionBattleServer } from "./server";
import { createActionEnemy } from "./enemies/factory";
import { executeActionBattleUse } from "./core/action-use";
import { getActionBattleOptions, setActionBattleOptions } from "./config";
import { setActionBattleSystems } from "./core/context";
import type { ActionBattleSkillEffectContext, ActionBattleSkillEffectResult } from "./core/contracts";

// A bomb whose path and area the effect gives.
const Bomb = {
  id: "bomb",
  name: "Bomb",
  _type: "item" as const,
  action: { mode: "projectile" as const, visual: { effect: "bomb-fx" } },
};

const Sword = { id: "sword", name: "Sword", atk: 60, _type: "weapon" as const };

let fixture: TestingFixture;
let player: RpgPlayer;
let playEffect: ReturnType<typeof vi.fn<(context: ActionBattleSkillEffectContext) => ActionBattleSkillEffectResult | boolean | void>>;

beforeEach(async () => {
  playEffect = vi.fn();
  const server = defineModule({
    maps: [{ id: "arena", file: "", width: 800, height: 600 }],
    database: { bomb: Bomb, sword: Sword },
    player: {
      async onConnected(p: RpgPlayer) {
        await p.changeMap("arena", { x: 100, y: 100 });
      },
    },
  });
  fixture = await testing(
    createModule("SkillPlayEffectTest", [
      { server, client: defineModule({}) },
      { server: createActionBattleServer({ skills: { playEffect } }), client: defineModule({}) },
    ])
  );
  const client = await fixture.createClient();
  player = await client.waitForMapChange("arena");
  player.initializeDefaultStats();
  player.addItem(Sword);
  player.equip("sword");
});

afterEach(async () => {
  vi.useRealTimers();
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

describe("skills.playEffect", () => {
  test("gives a projectile its path, its type and its area", async () => {
    const near = await spawnEnemy("near", 220, 100);
    player.addItem(Bomb, 1);
    player.assignHotbarSlot(1, { type: "item", id: "bomb" });
    playEffect.mockReturnValue({
      projectile: { type: "studio-bomb", trajectory: { type: "arc", range: 150, duration: 0.3, height: 40 }, params: { spin: 2 } },
      area: { radius: 60 },
    });
    const emit = vi.spyOn(player.getCurrentMap()!.projectiles, "emit");

    await useSlot(1, { x: 236, y: 116 });

    expect(playEffect).toHaveBeenCalledWith(expect.objectContaining({ mode: "projectile", usable: expect.objectContaining({ id: "bomb" }) }));
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "studio-bomb",
        trajectory: expect.objectContaining({ type: "arc", height: 40 }),
        params: expect.objectContaining({ spin: 2 }),
      }),
      expect.anything()
    );
    run(0.6);
    expect(near.hp).toBeLessThan(500);
  });
});

describe("skills.playEffect on an instant skill", () => {
  const entity = (id: string) => ({
    id,
    hp: 100,
    sp: 100,
    param: { maxhp: 100 },
    x: () => 0,
    y: () => 0,
    knockback: vi.fn(),
    applyStates: vi.fn(),
    applyDamage: vi.fn(() => ({ damage: 25 })),
    setGraphicAnimation: vi.fn(),
    flash: vi.fn(),
    showHit: vi.fn(),
  });
  const Spark = {
    id: "spark",
    _type: "skill",
    spCost: 0,
    hitRate: 1,
    action: { mode: "instant", target: "enemy", visual: { effect: "spark-fx", castFx: "magicBurst" } },
  };
  let saved: ReturnType<typeof getActionBattleOptions>;

  beforeEach(() => {
    saved = getActionBattleOptions();
  });
  afterEach(() => {
    setActionBattleOptions(saved);
    setActionBattleSystems({});
  });

  test("plays the effect at cast, and the hit lands at hitDelayMs", () => {
    const effect = vi.fn(() => ({ hitDelayMs: 300 }));
    setActionBattleOptions({ ...saved, skills: { ...saved.skills, playEffect: effect } });
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    const attacker = entity("caster");
    const target = entity("target");

    executeActionBattleUse({ attacker: attacker as any, target: target as any, usable: Spark, skill: Spark });

    expect(effect).toHaveBeenCalledWith(expect.objectContaining({
      mode: "instant",
      attacker,
      target,
      skill: Spark,
      visual: Spark.action.visual,
    }));
    expect(target.applyDamage).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(target.applyDamage).toHaveBeenCalledWith(attacker, expect.objectContaining({ id: "spark" }));
  });

  test("hits at once when nothing was played", () => {
    const effect = vi.fn(() => false);
    setActionBattleOptions({ ...saved, skills: { ...saved.skills, playEffect: effect } });
    const attacker = entity("caster");
    const target = entity("target");

    executeActionBattleUse({ attacker: attacker as any, target: target as any, usable: Spark, skill: Spark });

    expect(effect).toHaveBeenCalled();
    expect(target.applyDamage).toHaveBeenCalled();
  });

  test("a failing playEffect does not stop the skill", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    setActionBattleOptions({ ...saved, skills: { ...saved.skills, playEffect: () => { throw new Error("boom"); } } });
    const attacker = entity("caster");
    const target = entity("target");

    executeActionBattleUse({ attacker: attacker as any, target: target as any, usable: Spark, skill: Spark });

    expect(target.applyDamage).toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith("[ActionBattle] skills.playEffect failed:", expect.any(Error));
    error.mockRestore();
  });
});
