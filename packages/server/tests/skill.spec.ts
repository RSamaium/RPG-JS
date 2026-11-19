import { beforeEach, test, expect, afterEach, describe, vi } from "vitest";
import { testing, TestingFixture } from "@rpgjs/testing";
import { defineModule, createModule } from "@rpgjs/common";
import { RpgPlayer, MAXSP, ATK, PDEF, registerSkillUseHandler } from "../src";
import { Effect } from "../src/Player/EffectManager";
import type { SkillObject } from "../src/Player/SkillManager";

/**
 * Test skill object for basic skill tests
 */
const FireSkill = {
  id: "fire",
  name: "Fire",
  description: "A basic fire spell",
  spCost: 10,
  hitRate: 1,
  power: 50,
  coefficient: { [ATK]: 0, [PDEF]: 0 },
  _type: "skill" as const,
};

/**
 * Test skill with high SP cost
 */
const UltimateSkill = {
  id: "ultimate",
  name: "Ultimate Strike",
  description: "A powerful ultimate skill",
  spCost: 100,
  hitRate: 1,
  power: 200,
  coefficient: { [ATK]: 0, [PDEF]: 0 },
  _type: "skill" as const,
};

/**
 * Test skill with low hit rate (50% chance)
 */
const LowHitRateSkill = {
  id: "low-hit-rate",
  name: "Risky Attack",
  description: "A skill with low success rate",
  spCost: 5,
  hitRate: 0.5,
  power: 100,
  coefficient: { [ATK]: 0, [PDEF]: 0 },
  _type: "skill" as const,
};

/**
 * Test skill with 0% hit rate (always fails)
 */
const AlwaysFailSkill = {
  id: "always-fail",
  name: "Always Fail",
  description: "A skill that always fails",
  spCost: 5,
  hitRate: 0,
  power: 50,
  coefficient: { [ATK]: 0, [PDEF]: 0 },
  _type: "skill" as const,
};

/**
 * Test healing skill (no damage, heals target)
 */
const HealSkill = {
  id: "heal",
  name: "Heal",
  description: "Restores HP to target",
  spCost: 15,
  hitRate: 1,
  hpValue: 50,
  power: 0,
  coefficient: { [ATK]: 0, [PDEF]: 0 },
  _type: "skill" as const,
};

/**
 * Test free skill (no SP cost)
 */
const FreeSkill = {
  id: "free-skill",
  name: "Free Skill",
  description: "A skill with no cost",
  spCost: 0,
  hitRate: 1,
  power: 10,
  coefficient: { [ATK]: 0, [PDEF]: 0 },
  _type: "skill" as const,
};

let player: RpgPlayer;
let fixture: TestingFixture;
const onSkillChangeSpy = vi.fn();

// Define server module with skills in database
const serverModule = defineModule({
  maps: [
    {
      id: "test-map",
      file: "",
    },
  ],
  database: {
    fire: FireSkill,
    ultimate: UltimateSkill,
    "low-hit-rate": LowHitRateSkill,
    "always-fail": AlwaysFailSkill,
    heal: HealSkill,
    "free-skill": FreeSkill,
  },
  player: {
    async onConnected(player) {
      await player.changeMap("test-map", { x: 100, y: 100 });
    },
    onSkillChange: onSkillChangeSpy,
  },
});

// Define client module
const clientModule = defineModule({
  // Client-side logic
});

beforeEach(async () => {
  onSkillChangeSpy.mockClear();
  const myModule = createModule("TestModule", [
    {
      server: serverModule,
      client: clientModule,
    },
  ]);

  fixture = await testing(myModule);
  const clientTesting = await fixture.createClient();
  player = await clientTesting.waitForMapChange("test-map");

  // Initialize player SP for skill tests
  player.sp = 100;
  player.param[MAXSP] = 100;
});

afterEach(async () => {
  await fixture.clear();
});

describe("Skill Management - Learning Skills", () => {
  test("should learn a skill using string ID", () => {
    const skill = player.learnSkill("fire");
    expect(skill).toBeDefined();
    expect(skill.id).toBe("fire");
    expect(skill.name).toBe("Fire");
  });

  test("should learn a skill using object", () => {
    const customSkill: SkillObject = {
      id: "custom-skill",
      name: "Custom Skill",
      spCost: 20,
      hitRate: 1,
      power: 30,
      coefficient: { [ATK]: 0, [PDEF]: 0 },
      _type: "skill",
    };
    const skill = player.learnSkill(customSkill);
    expect(skill).toBeDefined();
    expect(skill.id).toBe("custom-skill");
    expect(skill.name).toBe("Custom Skill");
  });

  test("should auto-generate ID for skill object without ID", () => {
    const customSkill: SkillObject = {
      name: "Auto ID Skill",
      spCost: 5,
      hitRate: 1,
    };
    const skill = player.learnSkill(customSkill);
    expect(skill).toBeDefined();
    expect(skill.id).toMatch(/^skill-\d+$/);
    expect(skill.name).toBe("Auto ID Skill");
  });

  test("should throw error when learning already learned skill", () => {
    player.learnSkill("fire");
    expect(() => {
      player.learnSkill("fire");
    }).toThrow();
  });

  test("should throw error when learning already learned skill using object", () => {
    player.learnSkill("fire");
    const duplicateSkill: SkillObject = {
      id: "fire",
      name: "Duplicate Fire",
    };
    expect(() => {
      player.learnSkill(duplicateSkill);
    }).toThrow();
  });

  test("should learn multiple different skills", () => {
    player.learnSkill("fire");
    player.learnSkill("heal");
    player.learnSkill("free-skill");

    expect(player.getSkill("fire")).toBeDefined();
    expect(player.getSkill("heal")).toBeDefined();
    expect(player.getSkill("free-skill")).toBeDefined();
    expect(player.skills().length).toBe(3);
  });

  test("should learn skill with object and use it", () => {
    const customSkill: SkillObject = {
      id: "direct-skill",
      name: "Direct Skill",
      spCost: 5,
      hitRate: 1,
      power: 0,
      coefficient: { [ATK]: 0, [PDEF]: 0 },
    };
    player.learnSkill(customSkill);
    const initialSp = player.sp;
    const skill = player.useSkill("direct-skill");
    expect(skill).toBeDefined();
    expect(player.sp).toBe(initialSp - 5);
  });
});

describe("Skill Management - Getting Skills", () => {
  test("should get learned skill by string ID", () => {
    player.learnSkill("fire");
    const skill = player.getSkill("fire");
    expect(skill).toBeDefined();
    expect(skill.id).toBe("fire");
  });

  test("should get learned skill by object", () => {
    const customSkill: SkillObject = {
      id: "get-test-skill",
      name: "Get Test Skill",
      spCost: 10,
    };
    player.learnSkill(customSkill);
    const skill = player.getSkill({ id: "get-test-skill" });
    expect(skill).toBeDefined();
    expect(skill.id).toBe("get-test-skill");
  });

  test("should return null for non-learned skill", () => {
    const skill = player.getSkill("fire");
    expect(skill).toBeNull();
  });
});

describe("Skill Management - Forgetting Skills", () => {
  test("should forget a learned skill using string ID", () => {
    player.learnSkill("fire");
    const forgottenSkill = player.forgetSkill("fire");
    expect(forgottenSkill).toBeDefined();
    expect(player.getSkill("fire")).toBeNull();
  });

  test("should forget a learned skill using object", () => {
    const customSkill: SkillObject = {
      id: "forget-test-skill",
      name: "Forget Test Skill",
      spCost: 10,
    };
    player.learnSkill(customSkill);
    const forgottenSkill = player.forgetSkill({ id: "forget-test-skill" });
    expect(forgottenSkill).toBeDefined();
    expect(player.getSkill("forget-test-skill")).toBeNull();
  });

  test("should throw error when forgetting non-learned skill", () => {
    expect(() => {
      player.forgetSkill("fire");
    }).toThrow();
  });

  test("should be able to relearn forgotten skill", () => {
    player.learnSkill("fire");
    player.forgetSkill("fire");
    const skill = player.learnSkill("fire");
    expect(skill).toBeDefined();
    expect(player.getSkill("fire")).toBeDefined();
  });

  test("should maintain skill list integrity after operations", () => {
    player.learnSkill("fire");
    player.learnSkill("heal");
    player.learnSkill("free-skill");

    expect(player.skills().length).toBe(3);

    player.forgetSkill("heal");
    expect(player.skills().length).toBe(2);
    expect(player.getSkill("fire")).toBeDefined();
    expect(player.getSkill("heal")).toBeNull();
    expect(player.getSkill("free-skill")).toBeDefined();
  });
});

describe("Skill Management - Using Skills", () => {
  test("should use skill and consume SP", () => {
    player.learnSkill("fire");
    const initialSp = player.sp;
    const skill = player.useSkill("fire");
    expect(skill).toBeDefined();
    expect(player.sp).toBe(initialSp - FireSkill.spCost);
  });

  test("should use free skill without consuming SP", () => {
    player.learnSkill("free-skill");
    const initialSp = player.sp;
    player.useSkill("free-skill");
    expect(player.sp).toBe(initialSp);
  });

  test("should throw error when using non-learned skill", () => {
    expect(() => {
      player.useSkill("fire");
    }).toThrow();
  });

  test("should throw error when not enough SP", () => {
    player.sp = 5; // Not enough for FireSkill (costs 10)
    player.learnSkill("fire");
    expect(() => {
      player.useSkill("fire");
    }).toThrow();
  });

  test("should throw error when SP is exactly 0", () => {
    player.sp = 0;
    player.learnSkill("fire");
    expect(() => {
      player.useSkill("fire");
    }).toThrow();
  });

  test("should use skill with exact SP amount", () => {
    player.sp = FireSkill.spCost; // Exactly enough
    player.learnSkill("fire");
    const skill = player.useSkill("fire");
    expect(skill).toBeDefined();
    expect(player.sp).toBe(0);
  });
});

describe("Skill Management - Hit Rate", () => {
  test("should use skill successfully when hitRate passes", () => {
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.3); // 0.3 < 0.5 (hitRate)

    player.learnSkill("low-hit-rate");
    const skill = player.useSkill("low-hit-rate");
    expect(skill).toBeDefined();

    Math.random = originalRandom;
  });

  test("should fail when hitRate check fails", () => {
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.9); // 0.9 > 0.5 (hitRate)

    player.learnSkill("low-hit-rate");
    expect(() => {
      player.useSkill("low-hit-rate");
    }).toThrow();

    Math.random = originalRandom;
  });

  test("should always fail with 0 hitRate", () => {
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.001); // Even very small number > 0

    player.learnSkill("always-fail");
    expect(() => {
      player.useSkill("always-fail");
    }).toThrow();

    Math.random = originalRandom;
  });

  test("should still consume SP even when hitRate fails", () => {
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.9); // Will fail

    player.learnSkill("low-hit-rate");
    const initialSp = player.sp;

    try {
      player.useSkill("low-hit-rate");
    } catch {
      // Expected to throw
    }

    // SP should be consumed even on failure
    expect(player.sp).toBe(initialSp - LowHitRateSkill.spCost);

    Math.random = originalRandom;
  });

  test("should always succeed with hitRate of 1", () => {
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.99);

    player.learnSkill("fire"); // hitRate: 1
    const skill = player.useSkill("fire");
    expect(skill).toBeDefined();

    Math.random = originalRandom;
  });
});

describe("Skill Management - Effects and Restrictions", () => {
  test("should throw error when player has CAN_NOT_SKILL effect", () => {
    player.learnSkill("fire");
    player.effects = [Effect.CAN_NOT_SKILL];
    expect(() => {
      player.useSkill("fire");
    }).toThrow();
  });

  test("should use half SP cost with HALF_SP_COST effect", () => {
    player.learnSkill("fire");
    player.effects = [Effect.HALF_SP_COST];
    const initialSp = player.sp;

    player.useSkill("fire");
    expect(player.sp).toBe(initialSp - FireSkill.spCost / 2);
  });

  test("should use half SP cost rounded correctly", () => {
    player.learnSkill("low-hit-rate"); // spCost: 5

    // Mock random to pass
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.1);

    player.effects = [Effect.HALF_SP_COST];
    const initialSp = player.sp;

    player.useSkill("low-hit-rate");
    expect(player.sp).toBe(initialSp - LowHitRateSkill.spCost / 2);

    Math.random = originalRandom;
  });
});

describe("Skill Management - Using Skills on Targets", () => {
  let targetPlayer: RpgPlayer;

  beforeEach(async () => {
    const clientTesting2 = await fixture.createClient();
    targetPlayer = await clientTesting2.waitForMapChange("test-map");
    targetPlayer.sp = 100;
    targetPlayer.param[MAXSP] = 100;
  });

  test("should use skill on single target", () => {
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.1);

    player.learnSkill("fire");
    const skill = player.useSkill("fire", targetPlayer);
    expect(skill).toBeDefined();

    Math.random = originalRandom;
  });

  test("should use skill on multiple targets", () => {
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.1);

    player.learnSkill("fire");
    const skill = player.useSkill("fire", [targetPlayer]);
    expect(skill).toBeDefined();

    Math.random = originalRandom;
  });

  test("should use healing skill on target", () => {
    player.learnSkill("heal");
    const skill = player.useSkill("heal", targetPlayer);
    expect(skill).toBeDefined();
  });
});

describe("Skill Management - Hooks", () => {
  test("should call onLearn hook when learning skill", () => {
    const onLearnSpy = vi.fn();
    const customSkill: SkillObject = {
      id: "learn-hook-skill",
      name: "Learn Hook Skill",
      spCost: 10,
      hitRate: 1,
      power: 0,
      coefficient: { [ATK]: 0, [PDEF]: 0 },
      _type: "skill",
      onLearn: onLearnSpy,
    };

    player.learnSkill(customSkill);
    expect(onLearnSpy).toHaveBeenCalledWith(player);
  });

  test("should call onForget hook when forgetting skill", () => {
    const onForgetSpy = vi.fn();
    const customSkill: SkillObject = {
      id: "forget-hook-skill",
      name: "Forget Hook Skill",
      spCost: 10,
      hitRate: 1,
      power: 0,
      coefficient: { [ATK]: 0, [PDEF]: 0 },
      _type: "skill",
      onForget: onForgetSpy,
    };

    player.learnSkill(customSkill);
    player.forgetSkill("forget-hook-skill");
    expect(onForgetSpy).toHaveBeenCalledWith(player);
  });

  test("should call player onSkillChange hook when learning skill", () => {
    const skill = player.learnSkill("fire");

    expect(skill).toBe(FireSkill);
    expect(onSkillChangeSpy).toHaveBeenCalledWith(
      player,
      expect.objectContaining({
        action: "learn",
        skill: FireSkill,
        skillId: "fire",
        source: "manual",
      }),
    );
  });

  test("should call player onSkillChange hook when forgetting skill", () => {
    player.learnSkill("fire");
    onSkillChangeSpy.mockClear();

    player.forgetSkill("fire");

    expect(onSkillChangeSpy).toHaveBeenCalledWith(
      player,
      expect.objectContaining({
        action: "forget",
        skillId: "fire",
        source: "manual",
      }),
    );
  });

  test("should pass source and level to onSkillChange hook", () => {
    player.learnSkill("fire", { source: "level", level: 3 });

    expect(onSkillChangeSpy).toHaveBeenCalledWith(
      player,
      expect.objectContaining({
        action: "learn",
        skillId: "fire",
        source: "level",
        level: 3,
      }),
    );
  });

  test("should call onUse hook when using skill successfully", () => {
    const onUseSpy = vi.fn();
    const customSkill: SkillObject = {
      id: "use-hook-skill",
      name: "Use Hook Skill",
      spCost: 10,
      hitRate: 1,
      power: 0,
      coefficient: { [ATK]: 0, [PDEF]: 0 },
      _type: "skill",
      onUse: onUseSpy,
    };

    player.learnSkill(customSkill);
    player.useSkill("use-hook-skill");
    expect(onUseSpy).toHaveBeenCalledWith(player, undefined);
  });

  test("should call onUse hook with target when provided", async () => {
    const onUseSpy = vi.fn();
    const customSkill: SkillObject = {
      id: "use-hook-target-skill",
      name: "Use Hook Target Skill",
      spCost: 10,
      hitRate: 1,
      power: 0,
      coefficient: { [ATK]: 0, [PDEF]: 0 },
      _type: "skill",
      onUse: onUseSpy,
    };

    const clientTesting2 = await fixture.createClient();
    const targetPlayer = await clientTesting2.waitForMapChange("test-map");

    player.learnSkill(customSkill);
    player.useSkill("use-hook-target-skill", targetPlayer);
    expect(onUseSpy).toHaveBeenCalledWith(player, targetPlayer);
  });

  test("should call onUseFailed hook when hitRate fails", () => {
    const onUseFailedSpy = vi.fn();
    const customSkill: SkillObject = {
      id: "use-failed-hook-skill",
      name: "Use Failed Hook Skill",
      spCost: 5,
      hitRate: 0.1, // 10% chance
      power: 0,
      coefficient: { [ATK]: 0, [PDEF]: 0 },
      _type: "skill",
      onUseFailed: onUseFailedSpy,
    };

    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.9); // Will fail

    player.learnSkill(customSkill);
    try {
      player.useSkill("use-failed-hook-skill");
    } catch {
      // Expected to throw
    }
    expect(onUseFailedSpy).toHaveBeenCalledWith(player, undefined);

    Math.random = originalRandom;
  });
});

describe("Skill Management - Edge Cases", () => {
  test("should handle skill with default hitRate (1)", () => {
    const skillWithoutHitRate: SkillObject = {
      id: "no-hitrate-skill",
      name: "No HitRate Skill",
      spCost: 10,
      power: 0,
      coefficient: { [ATK]: 0, [PDEF]: 0 },
      _type: "skill",
      // No hitRate specified, should default to 1
    };

    player.learnSkill(skillWithoutHitRate);
    const skill = player.useSkill("no-hitrate-skill");
    expect(skill).toBeDefined();
  });

  test("should handle skill with 0 SP cost", () => {
    player.sp = 0;
    player.learnSkill("free-skill");
    const skill = player.useSkill("free-skill");
    expect(skill).toBeDefined();
    expect(player.sp).toBe(0);
  });

  test("should handle multiple skill usages in sequence", () => {
    player.sp = 50;
    player.learnSkill("fire"); // costs 10

    player.useSkill("fire");
    expect(player.sp).toBe(40);

    player.useSkill("fire");
    expect(player.sp).toBe(30);

    player.useSkill("fire");
    expect(player.sp).toBe(20);
  });

  test("should handle learning and forgetting same skill multiple times", () => {
    player.learnSkill("fire");
    player.forgetSkill("fire");
    player.learnSkill("fire");
    player.forgetSkill("fire");
    player.learnSkill("fire");

    expect(player.getSkill("fire")).toBeDefined();
    expect(player.skills().length).toBe(1);
  });

  test("should merge object properties when skill already in database", () => {
    // First, learn fire from database
    player.learnSkill("fire");
    player.forgetSkill("fire");

    // Now learn with modified properties
    const modifiedFire: SkillObject = {
      id: "fire",
      name: "Modified Fire",
      spCost: 5, // Changed from 10
    };
    const skill = player.learnSkill(modifiedFire);
    expect(skill.name).toBe("Modified Fire");
    expect(skill.spCost).toBe(5);
  });
});

describe("Skill Management - Skill use handlers", () => {
  test("a handler runs the skill instead of the native rule", () => {
    player.learnSkill("fire");
    const handler = vi.fn(() => ({ id: "fire", handled: true }) as any);
    const unregister = registerSkillUseHandler(handler);
    try {
      const used = player.useSkill("fire");
      expect(handler).toHaveBeenCalledWith(player, "fire", undefined);
      expect((used as any).handled).toBe(true);
      // The native rule did not run: no SP spent.
      expect(player.sp).toBe(100);
    } finally {
      unregister();
    }
  });

  test("a handler that returns undefined leaves the skill to the native rule", () => {
    player.learnSkill("fire");
    const unregister = registerSkillUseHandler(() => undefined);
    try {
      player.useSkill("fire");
      expect(player.sp).toBe(90);
    } finally {
      unregister();
    }
  });

  test("a silenced player is refused before any handler runs", () => {
    player.learnSkill("fire");
    player.effects = [Effect.CAN_NOT_SKILL];
    const handler = vi.fn(() => ({ id: "fire" }) as any);
    const unregister = registerSkillUseHandler(handler);
    try {
      expect(() => player.useSkill("fire")).toThrow();
      expect(handler).not.toHaveBeenCalled();
    } finally {
      unregister();
      player.effects = [];
    }
  });

  test("a skill given as an object reaches the handlers with its id", () => {
    player.learnSkill("fire");
    const handler = vi.fn(() => ({ id: "fire" }) as any);
    const unregister = registerSkillUseHandler(handler);
    try {
      player.useSkill(FireSkill as any);
      expect(handler).toHaveBeenCalledWith(player, "fire", undefined);
    } finally {
      unregister();
    }
  });

  test("a useSkill called by a handler runs the native rule", () => {
    player.learnSkill("fire");
    const handler = vi.fn((p: RpgPlayer, id: string) => p.useSkill(id));
    const unregister = registerSkillUseHandler(handler);
    try {
      player.useSkill("fire");
      expect(handler).toHaveBeenCalledTimes(1);
      expect(player.sp).toBe(90);
    } finally {
      unregister();
    }
  });
});
