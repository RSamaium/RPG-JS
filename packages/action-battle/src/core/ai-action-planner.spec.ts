import { describe, expect, test } from "vitest";
import { evaluateActionBattleAiSkill } from "./ai-action-planner";

const player = (id: string, x: number, y: number) => ({
  id,
  hp: 10,
  x: () => x,
  y: () => y,
  hitbox: () => ({ w: 0, h: 0 }),
});

const enemy = (map: any, hp = 10) => ({
  id: "enemy",
  hp,
  sp: 20,
  x: () => 0,
  y: () => 0,
  hitbox: () => ({ w: 0, h: 0 }),
  getCurrentMap: () => map,
  battleAi: {
    getFaction: () => "enemies",
    getTargets: () => "players",
  },
});

describe("Action Battle AI skill planner", () => {
  test("uses Studio targeting range for a projectile without requiring contact", () => {
    const target = player("hero", 150, 0);
    const map = {
      tileWidth: 32,
      tileHeight: 32,
      getPlayers: () => [target],
      getEvents: () => [],
    };
    const evaluation = evaluateActionBattleAiSkill({
      attacker: enemy(map) as any,
      target: target as any,
      skill: {
        id: "fireball",
        spCost: 4,
        targeting: { range: 6 },
        action: { mode: "projectile", target: "enemy", cooldownMs: 800 },
      },
      now: 1000,
      readyAt: 0,
      attackRange: 50,
      hpPercent: 1,
    });

    expect(evaluation).toMatchObject({
      id: "fireball",
      mode: "projectile",
      range: 192,
      preferredRange: 144,
    });
    expect(evaluation.rejection).toBeUndefined();
  });

  test("prefers explicit projectile range over Studio targeting range", () => {
    const target = player("hero", 100, 0);
    const map = { tileWidth: 32, tileHeight: 32 };
    const evaluation = evaluateActionBattleAiSkill({
      attacker: enemy(map) as any,
      target: target as any,
      skill: {
        id: "short-bolt",
        targeting: { range: 6 },
        action: {
          mode: "projectile",
          target: "enemy",
          projectile: { range: 80 },
        },
      },
      now: 1000,
      readyAt: 0,
      attackRange: 50,
      hpPercent: 1,
    });

    expect(evaluation.range).toBe(80);
    expect(evaluation.rejection).toBe("outOfRange");
  });

  test("places an instant area skill so a hollow mask covers the player", () => {
    const target = player("hero", 64, 0);
    const map = {
      tileWidth: 32,
      tileHeight: 32,
      getPlayers: () => [target],
      getEvents: () => [],
    };
    const evaluation = evaluateActionBattleAiSkill({
      attacker: enemy(map) as any,
      target: target as any,
      skill: {
        id: "cross",
        targeting: {
          range: 1,
          aoeMask: ["010", "101", "010"],
        },
        action: { mode: "instant", target: "enemy" },
      },
      now: 1000,
      readyAt: 0,
      attackRange: 50,
      hpPercent: 1,
    });

    expect(evaluation.targetTile).toEqual({ x: 1, y: 0 });
    expect(evaluation.target).toEqual([target]);
    expect(evaluation.rejection).toBeUndefined();
  });

  test("uses self healing only below the automatic health threshold", () => {
    const map = {};
    const attacker = enemy(map, 5);
    const target = player("hero", 20, 0);
    const skill = {
      id: "heal",
      skillType: "healing",
      action: { mode: "instant", target: "self" },
    };
    const lowHealth = evaluateActionBattleAiSkill({
      attacker: attacker as any,
      target: target as any,
      skill,
      now: 1000,
      readyAt: 0,
      attackRange: 50,
      hpPercent: 0.5,
    });
    const healthy = evaluateActionBattleAiSkill({
      attacker: attacker as any,
      target: target as any,
      skill,
      now: 1000,
      readyAt: 0,
      attackRange: 50,
      hpPercent: 0.8,
    });

    expect(lowHealth.target).toBe(attacker);
    expect(lowHealth.rejection).toBeUndefined();
    expect(healthy.rejection).toBe("notUseful");
  });
});
