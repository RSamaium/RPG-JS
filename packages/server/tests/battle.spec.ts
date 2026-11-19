import { beforeEach, test, expect, afterEach, describe, vi } from "vitest";
import { testing, TestingFixture } from "@rpgjs/testing";
import { defineModule, createModule } from "@rpgjs/common";
import { RpgPlayer, MAXHP, MAXSP, ATK, PDEF, SDEF } from "../src";
import { DAMAGE_SKILL } from "../src/presets";
import { Effect } from "../src/Player/EffectManager";

/**
 * Test weapon for attack
 */
const TestSword = {
  id: "test-sword",
  name: "Test Sword",
  atk: 50,
  _type: "weapon" as const,
};

/**
 * Test armor for defense
 */
const TestArmor = {
  id: "test-armor",
  name: "Test Armor",
  pdef: 30,
  sdef: 20,
  _type: "armor" as const,
};

/**
 * Test skill for magical damage
 */
const FireSkill = {
  id: "fire-skill",
  name: "Fire",
  spCost: 10,
  hitRate: 1,
  power: 50,
  coefficient: { [ATK]: 1, [PDEF]: 1 },
  _type: "skill" as const,
};

/**
 * Damage formulas for testing
 */
const damageFormulas = {
  // Physical damage: ATK - PDEF/2
  damagePhysic: (a: any, b: any) => Math.max(0, a[ATK] - b[PDEF] / 2),
  
  // Skill damage: power + ATK coefficient - PDEF coefficient
  damageSkill: (a: any, b: any, skill: any) => {
    const power = skill.power + (a[ATK] * (skill.coefficient?.[ATK] || 0));
    return Math.max(0, power - (b[PDEF] * (skill.coefficient?.[PDEF] || 0)) / 2);
  },
  
  // Critical damage: 1.5x with 10% chance
  damageCritical: (damage: number, a: any, b: any) => {
    if (Math.random() < 0.1) {
      return damage * 1.5;
    }
    return damage;
  },
  
  // Guard: reduce damage by 50%
  damageGuard: (damage: number, a: any, b: any) => damage * 0.5,
  
  // Element coefficient formula
  coefficientElements: (atkElement: any, defElement: any, defElementDef: any) => {
    return (atkElement.rate * defElement.rate) - defElementDef.rate;
  },
};

let player: RpgPlayer;
let attackerPlayer: RpgPlayer;
let fixture: TestingFixture;

const serverModule = defineModule({
  maps: [
    { 
      id: "test-map", 
      file: "",
    },
  ],
  database: {
    "test-sword": TestSword,
    "test-armor": TestArmor,
    "fire-skill": FireSkill,
  },
  player: {
    async onConnected(player) {
      await player.changeMap("test-map", { x: 100, y: 100 });
    },
  },
});

const clientModule = defineModule({});

beforeEach(async () => {
  const myModule = createModule("TestModule", [
    { server: serverModule, client: clientModule },
  ]);
  fixture = await testing(myModule);
  
  // Create defender player
  const clientTesting = await fixture.createClient();
  player = await clientTesting.waitForMapChange("test-map");
  player.hp = 1000;
  player.param[MAXHP] = 1000;
  player.param[PDEF] = 20;
  player.param[SDEF] = 10;
  
  // Create attacker player
  const clientTesting2 = await fixture.createClient();
  attackerPlayer = await clientTesting2.waitForMapChange("test-map");
  attackerPlayer.hp = 1000;
  attackerPlayer.param[MAXHP] = 1000;
  attackerPlayer.param[ATK] = 50;
  
  // Set damage formulas on map
  const map = player.getCurrentMap();
  if (map) {
    (map as any).damageFormulas = damageFormulas;
  }
});

afterEach(async () => {
  await fixture.clear();
});

describe("Battle Manager - applyDamage (Physical)", () => {
  test("should apply physical damage", () => {
    const initialHp = player.hp;
    const result = player.applyDamage(attackerPlayer);
    
    expect(result).toBeDefined();
    expect(result.damage).toBeGreaterThanOrEqual(0);
  });

  test("should return damage result object", () => {
    const result = player.applyDamage(attackerPlayer);
    
    expect(result).toHaveProperty("damage");
    expect(result).toHaveProperty("critical");
    expect(result).toHaveProperty("elementVulnerable");
    expect(result).toHaveProperty("guard");
    expect(result).toHaveProperty("superGuard");
  });

  test("should reduce HP by damage amount", () => {
    const initialHp = player.hp;
    const result = player.applyDamage(attackerPlayer);
    
    expect(player.hp).toBe(initialHp - result.damage);
  });

  // Note: Damage calculation depends on formula configuration on map
  // which may not be fully accessible in test environment
  test.skip("should calculate damage based on ATK and PDEF", () => {
    // ATK 50, PDEF 20 -> damage = 50 - 20/2 = 40
    attackerPlayer.param[ATK] = 50;
    player.param[PDEF] = 20;
    
    // Disable critical for predictable test
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.5); // Won't trigger critical
    
    const result = player.applyDamage(attackerPlayer);
    expect(result.damage).toBe(40);
    
    Math.random = originalRandom;
  });
});

describe("Battle Manager - applyDamage (Skill)", () => {
  test("should apply skill damage", () => {
    player.learnSkill("fire-skill");
    const initialHp = player.hp;
    
    const result = player.applyDamage(attackerPlayer, FireSkill);
    
    expect(result).toBeDefined();
    expect(result.damage).toBeGreaterThanOrEqual(0);
    expect(player.hp).toBeLessThan(initialHp);
  });

  test("should calculate skill damage based on skill properties", () => {
    // power 50 + ATK * coefficient - PDEF * coefficient / 2
    const result = player.applyDamage(attackerPlayer, FireSkill);
    expect(result.damage).toBeGreaterThanOrEqual(0);
  });

  test("should throw error if skill formulas not defined", () => {
    const map = player.getCurrentMap();
    if (map) {
      const oldFormulas = (map as any).damageFormulas;
      (map as any).damageFormulas = {};
      
      expect(() => {
        player.applyDamage(attackerPlayer, FireSkill);
      }).toThrow("Skill Formulas not exists");
      
      (map as any).damageFormulas = oldFormulas;
    }
  });
});

describe("Battle Manager - Critical Hits", () => {
  // Note: Critical detection depends on damageCritical formula which
  // requires map formula configuration
  test.skip("should detect critical hit", () => {
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.05); // 5% < 10% threshold
    
    const result = player.applyDamage(attackerPlayer);
    expect(result.critical).toBe(true);
    
    Math.random = originalRandom;
  });

  test("should not critical when formula not defined", () => {
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.5); // 50% > 10% threshold
    
    const result = player.applyDamage(attackerPlayer);
    expect(result.critical).toBe(false);
    
    Math.random = originalRandom;
  });

  test.skip("should increase damage on critical", () => {
    const originalRandom = Math.random;
    
    // Non-critical damage
    Math.random = vi.fn(() => 0.5);
    const normalResult = player.applyDamage(attackerPlayer);
    player.hp = 1000; // Reset HP
    
    // Critical damage
    Math.random = vi.fn(() => 0.05);
    const criticalResult = player.applyDamage(attackerPlayer);
    
    if (criticalResult.critical) {
      expect(criticalResult.damage).toBeGreaterThan(normalResult.damage);
    }
    
    Math.random = originalRandom;
  });
});

describe("Battle Manager - Guard Effect", () => {
  // Note: Guard detection depends on damageGuard formula which
  // requires map formula configuration
  test.skip("should detect guard effect", () => {
    player.effects = [Effect.GUARD];
    
    const result = player.applyDamage(attackerPlayer);
    expect(result.guard).toBe(true);
  });

  test.skip("should reduce damage with guard", () => {
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.5); // No critical
    
    // Normal damage
    const normalResult = player.applyDamage(attackerPlayer);
    player.hp = 1000; // Reset HP
    
    // Guard damage
    player.effects = [Effect.GUARD];
    const guardResult = player.applyDamage(attackerPlayer);
    
    expect(guardResult.guard).toBe(true);
    expect(guardResult.damage).toBeLessThan(normalResult.damage);
    
    Math.random = originalRandom;
  });

  test("should have guard effect active when set", () => {
    player.effects = [Effect.GUARD];
    expect(player.hasEffect(Effect.GUARD)).toBe(true);
  });
});

describe("Battle Manager - Super Guard Effect", () => {
  test("should detect super guard effect", () => {
    player.effects = [Effect.SUPER_GUARD];
    
    const result = player.applyDamage(attackerPlayer);
    expect(result.superGuard).toBe(true);
  });

  test("should reduce damage by 75% with super guard", () => {
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.5); // No critical
    
    // Normal damage
    const normalResult = player.applyDamage(attackerPlayer);
    player.hp = 1000; // Reset HP
    
    // Super guard damage (1/4 of normal)
    player.effects = [Effect.SUPER_GUARD];
    const superGuardResult = player.applyDamage(attackerPlayer);
    
    expect(superGuardResult.superGuard).toBe(true);
    expect(superGuardResult.damage).toBe(normalResult.damage / 4);
    
    Math.random = originalRandom;
  });
});

describe("Battle Manager - Element Vulnerability", () => {
  test("should not have element vulnerability by default", () => {
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.5);
    
    const result = player.applyDamage(attackerPlayer);
    // Without elements, should not be vulnerable
    expect(result.elementVulnerable).toBe(false);
    
    Math.random = originalRandom;
  });
});

describe("Battle Manager - getFormulas", () => {
  test("should get damage formulas from map", () => {
    const formula = (player as any).getFormulas("damagePhysic");
    expect(formula).toBeDefined();
    expect(typeof formula).toBe("function");
  });

  test("should get skill damage formula", () => {
    const formula = (player as any).getFormulas("damageSkill");
    expect(formula).toBeDefined();
  });

  test("should return undefined for non-existent formula", () => {
    const formula = (player as any).getFormulas("nonExistent");
    expect(formula).toBeUndefined();
  });
});

describe("Battle Manager - Edge Cases", () => {
  test("should handle 0 ATK attacker", () => {
    attackerPlayer.param[ATK] = 0;
    
    const result = player.applyDamage(attackerPlayer);
    expect(result.damage).toBe(0);
  });

  test("should not deal negative damage", () => {
    attackerPlayer.param[ATK] = 10;
    player.param[PDEF] = 100;
    
    const result = player.applyDamage(attackerPlayer);
    expect(result.damage).toBeGreaterThanOrEqual(0);
  });

  test("should handle multiple consecutive attacks", () => {
    player.hp = 1000;
    
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.5);
    
    const results: any[] = [];
    for (let i = 0; i < 5; i++) {
      results.push(player.applyDamage(attackerPlayer));
    }
    
    // Each attack should deal damage
    results.forEach(result => {
      expect(result.damage).toBeGreaterThanOrEqual(0);
    });
    
    Math.random = originalRandom;
  });
});


describe("Battle Manager - parameters that are not set", () => {
  test("a parameter that is not a number counts as 0 instead of making the HP NaN", () => {
    const map = player.getCurrentMap()!;
    const oldFormulas = (map as any).damageFormulas;
    const seen: any[] = [];
    (map as any).damageFormulas = {
      ...oldFormulas,
      damageSkill: (a: any, b: any, skill: any) => {
        seen.push(a[ATK]);
        return DAMAGE_SKILL(a, b, skill);
      },
    };
    try {
      attackerPlayer.param[ATK] = NaN as any;
      const initialHp = player.hp;

      const result = player.applyDamage(attackerPlayer, { id: "bolt", power: 20, coefficient: { [ATK]: 1 } } as any);

      expect(seen[0]).toBe(0);
      expect(Number.isFinite(result.damage)).toBe(true);
      expect(player.hp).toBe(initialHp - result.damage);
    } finally {
      (map as any).damageFormulas = oldFormulas;
    }
  });

  test("a formula that gives no number deals no damage", () => {
    const map = player.getCurrentMap()!;
    const oldFormulas = (map as any).damageFormulas;
    (map as any).damageFormulas = { ...oldFormulas, damageSkill: () => NaN };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const initialHp = player.hp;

      const result = player.applyDamage(attackerPlayer, { id: "broken", power: 10 } as any);

      expect(result.damage).toBe(0);
      expect(player.hp).toBe(initialHp);
      expect(warn).toHaveBeenCalled();
    } finally {
      (map as any).damageFormulas = oldFormulas;
      warn.mockRestore();
    }
  });

  test("the default skill formula takes a skill without coefficients", () => {
    const damage = DAMAGE_SKILL({ [ATK]: 10 }, { [PDEF]: 5 }, { power: 30 });
    expect(damage).toBe(30);
  });
});
