import { beforeEach, test, expect, afterEach, describe, vi } from "vitest";
import { testing, TestingFixture } from "@rpgjs/testing";
import { defineModule, createModule } from "@rpgjs/common";
import { RpgPlayer, MAXSP } from "../src";

/**
 * Test state class - Poison
 * 
 * A basic debuff state that damages over time.
 */
class PoisonState {
  static id = "poison";
  id = "poison";
  name = "Poison";
  description = "Takes damage over time";
  effects = [];
  
  // States can add/remove other states when applied
  addStates = [];
  removeStates = [];
}

/**
 * Test state class - Paralysis
 * 
 * A state that prevents actions.
 */
class ParalysisState {
  static id = "paralysis";
  id = "paralysis";
  name = "Paralysis";
  description = "Cannot move or act";
  effects = ["CAN_NOT_SKILL"];
  
  addStates = [];
  removeStates = [];
}

/**
 * Test state class - Berserk
 * 
 * A state that increases attack but reduces defense.
 */
class BerserkState {
  static id = "berserk";
  id = "berserk";
  name = "Berserk";
  description = "Increased attack, reduced defense";
  effects = [];
  
  addStates = [];
  removeStates = [];
}

/**
 * Test state class - Regeneration
 * 
 * A state that heals over time.
 */
class RegenerationState {
  static id = "regeneration";
  id = "regeneration";
  name = "Regeneration";
  description = "Heals over time";
  effects = [];
  
  addStates = [];
  removeStates = [];
}

/**
 * Test state class - Shield
 * 
 * A state that provides defense.
 */
class ShieldState {
  static id = "shield";
  id = "shield";
  name = "Shield";
  description = "Provides defense boost";
  effects = ["GUARD"];
  
  addStates = [];
  removeStates = [];
}

/**
 * State object for database
 */
const PoisonStateData = {
  id: "poison",
  name: "Poison",
  description: "Takes damage over time",
  effects: [],
  _type: "state" as const,
};

const ParalysisStateData = {
  id: "paralysis",
  name: "Paralysis",
  description: "Cannot move or act",
  effects: ["CAN_NOT_SKILL"],
  _type: "state" as const,
};

const BerserkStateData = {
  id: "berserk",
  name: "Berserk",
  description: "Increased attack, reduced defense",
  effects: [],
  _type: "state" as const,
};

let player: RpgPlayer;
let fixture: TestingFixture;

// Define server module with states in database
const serverModule = defineModule({
  maps: [
    {
      id: "test-map",
      file: "",
    },
  ],
  database: {
    poison: PoisonState,
    paralysis: ParalysisState,
    berserk: BerserkState,
    regeneration: RegenerationState,
    shield: ShieldState,
    // a state as plain data, as a Studio game gives its records
    rage: { name: "Rage", description: "Attacks without thinking", effects: [], _type: "state" },
  },
  player: {
    async onConnected(player) {
      await player.changeMap("test-map", { x: 100, y: 100 });
    },
  },
});

// Define client module
const clientModule = defineModule({
  // Client-side logic
});

beforeEach(async () => {
  const myModule = createModule("TestModule", [
    {
      server: serverModule,
      client: clientModule,
    },
  ]);

  fixture = await testing(myModule);
  const clientTesting = await fixture.createClient();
  player = await clientTesting.waitForMapChange("test-map");
});

afterEach(async () => {
  await fixture.clear();
});

describe("State Management - Adding States", () => {
  test("should add a state using class", () => {
    const state = player.addState(PoisonState);
    expect(state).toBeDefined();
    expect(state?.id).toBe("poison");
  });

  test("should add a state using string ID", () => {
    const state = player.addState("poison");
    expect(state).toBeDefined();
    expect(state?.id).toBe("poison");
  });

  test("should return null when adding already applied state", () => {
    player.addState(PoisonState);
    const result = player.addState(PoisonState);
    expect(result).toBeNull();
  });

  test("should add multiple different states", () => {
    player.addState(PoisonState);
    player.addState(ParalysisState);
    player.addState(BerserkState);

    expect(player.getState(PoisonState)).toBeDefined();
    expect(player.getState(ParalysisState)).toBeDefined();
    expect(player.getState(BerserkState)).toBeDefined();
    expect(player.states().length).toBe(3);
  });

  test("should throw error when chance roll fails", () => {
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.9); // 0.9 > 0.5 (chance)

    expect(() => {
      player.addState(PoisonState, 0.5);
    }).toThrow();

    Math.random = originalRandom;
  });

  test("should succeed when chance roll passes", () => {
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.3); // 0.3 < 0.5 (chance)

    const state = player.addState(PoisonState, 0.5);
    expect(state).toBeDefined();

    Math.random = originalRandom;
  });

  test("should always succeed with chance of 1", () => {
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.99);

    const state = player.addState(PoisonState, 1);
    expect(state).toBeDefined();

    Math.random = originalRandom;
  });
});

describe("State Management - Getting States", () => {
  test("should get applied state by class", () => {
    player.addState(PoisonState);
    const state = player.getState(PoisonState);
    expect(state).toBeDefined();
    expect(state.id).toBe("poison");
  });

  test("should get applied state by string ID", () => {
    player.addState("poison");
    const state = player.getState("poison");
    expect(state).toBeDefined();
    expect(state.id).toBe("poison");
  });

  test("should return undefined for non-applied state", () => {
    const state = player.getState(PoisonState);
    expect(state).toBeUndefined();
  });

  test("should return undefined for non-applied state by string ID", () => {
    const state = player.getState("poison");
    expect(state).toBeUndefined();
  });
});

describe("State Management - Removing States", () => {
  test("should remove an applied state by class", () => {
    player.addState(PoisonState);
    player.removeState(PoisonState);
    expect(player.getState(PoisonState)).toBeUndefined();
  });

  test("should remove an applied state by string ID", () => {
    player.addState("poison");
    player.removeState("poison");
    expect(player.getState("poison")).toBeUndefined();
  });

  test("should throw error when removing non-applied state", () => {
    expect(() => {
      player.removeState(PoisonState);
    }).toThrow();
  });

  test("should throw error when removing non-applied state by string ID", () => {
    expect(() => {
      player.removeState("poison");
    }).toThrow();
  });

  test("should throw error when chance roll fails for removal", () => {
    const originalRandom = Math.random;
    
    // First add the state (make random pass)
    Math.random = vi.fn(() => 0.1);
    player.addState(PoisonState);
    
    // Now try to remove with failing chance
    Math.random = vi.fn(() => 0.9); // 0.9 > 0.5 (chance)
    
    expect(() => {
      player.removeState(PoisonState, 0.5);
    }).toThrow();

    Math.random = originalRandom;
  });

  test("should succeed removal when chance roll passes", () => {
    const originalRandom = Math.random;
    
    Math.random = vi.fn(() => 0.1);
    player.addState(PoisonState);
    
    Math.random = vi.fn(() => 0.3); // 0.3 < 0.5 (chance)
    player.removeState(PoisonState, 0.5);
    
    expect(player.getState(PoisonState)).toBeUndefined();

    Math.random = originalRandom;
  });

  test("should be able to re-add state after removal", () => {
    player.addState(PoisonState);
    player.removeState(PoisonState);
    const state = player.addState(PoisonState);
    expect(state).toBeDefined();
    expect(player.getState(PoisonState)).toBeDefined();
  });
});

describe("State Management - Apply States (Batch)", () => {
  let targetPlayer: RpgPlayer;

  beforeEach(async () => {
    const clientTesting2 = await fixture.createClient();
    targetPlayer = await clientTesting2.waitForMapChange("test-map");
  });

  test("should apply multiple states to target player", () => {
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.1);

    player.applyStates(targetPlayer, {
      addStates: [
        { state: PoisonState, rate: 1 },
        { state: ParalysisState, rate: 1 },
      ],
    });

    expect(targetPlayer.getState(PoisonState)).toBeDefined();
    expect(targetPlayer.getState(ParalysisState)).toBeDefined();

    Math.random = originalRandom;
  });

  test("should remove multiple states from target player", () => {
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.1);

    // First add the states
    targetPlayer.addState(PoisonState);
    targetPlayer.addState(ParalysisState);

    // Then remove them via applyStates
    player.applyStates(targetPlayer, {
      removeStates: [
        { state: PoisonState, rate: 1 },
        { state: ParalysisState, rate: 1 },
      ],
    });

    expect(targetPlayer.getState(PoisonState)).toBeUndefined();
    expect(targetPlayer.getState(ParalysisState)).toBeUndefined();

    Math.random = originalRandom;
  });

  test("should add and remove states in same call", () => {
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.1);

    // First add a state to remove
    targetPlayer.addState(PoisonState);

    // Apply: add Berserk, remove Poison
    player.applyStates(targetPlayer, {
      addStates: [{ state: BerserkState, rate: 1 }],
      removeStates: [{ state: PoisonState, rate: 1 }],
    });

    expect(targetPlayer.getState(PoisonState)).toBeUndefined();
    expect(targetPlayer.getState(BerserkState)).toBeDefined();

    Math.random = originalRandom;
  });

  test("should handle empty addStates and removeStates", () => {
    player.applyStates(targetPlayer, {});
    expect(targetPlayer.states().length).toBe(0);
  });
});

describe("State Management - State Effects", () => {
  test("should have effects from state", () => {
    player.addState(ParalysisState);
    const state = player.getState(ParalysisState);
    expect(state.effects).toContain("CAN_NOT_SKILL");
  });

  test("should have effects from shield state", () => {
    player.addState(ShieldState);
    const state = player.getState(ShieldState);
    expect(state.effects).toContain("GUARD");
  });
});

describe("State Management - Edge Cases", () => {
  test("should handle adding and removing same state multiple times", () => {
    player.addState(PoisonState);
    player.removeState(PoisonState);
    player.addState(PoisonState);
    player.removeState(PoisonState);
    player.addState(PoisonState);

    expect(player.getState(PoisonState)).toBeDefined();
    expect(player.states().length).toBe(1);
  });

  test("should maintain state list integrity after operations", () => {
    player.addState(PoisonState);
    player.addState(ParalysisState);
    player.addState(BerserkState);

    expect(player.states().length).toBe(3);

    player.removeState(ParalysisState);
    expect(player.states().length).toBe(2);
    expect(player.getState(PoisonState)).toBeDefined();
    expect(player.getState(ParalysisState)).toBeUndefined();
    expect(player.getState(BerserkState)).toBeDefined();
  });

  test("should handle state with 0 chance (always fail)", () => {
    expect(() => {
      player.addState(PoisonState, 0);
    }).toThrow();
  });

  test("should work with both class and string ID for same state", () => {
    // Add with class
    player.addState(PoisonState);
    
    // Get with string ID
    const stateByString = player.getState("poison");
    expect(stateByString).toBeDefined();
    
    // Remove with class
    player.removeState(PoisonState);
    expect(player.getState("poison")).toBeUndefined();
  });
});

describe("State Management - State Efficiency", () => {
  test("should have empty statesEfficiency by default", () => {
    expect(player.statesEfficiency()).toEqual([]);
  });

  test("should be able to set statesEfficiency", () => {
    const efficiencies = [{ state: PoisonState, rate: 0.5 }];
    player.statesEfficiency = efficiencies as any;
    expect(player.statesEfficiency).toBeDefined();
  });

  test("should find state efficiency", () => {
    // Set up statesEfficiency
    player._statesEfficiency.set([{ state: new PoisonState(), rate: 0.5 }]);
    
    // This test depends on how findStateEfficiency is implemented
    // Currently it uses instanceof, so we need to check if it finds the efficiency
    const efficiency = player.findStateEfficiency(PoisonState);
    expect(efficiency).toBeDefined();
  });
});


describe("State Management - States of plain data", () => {
  test("adds, finds and removes a state the database gives as plain data", () => {
    const state = player.addState("rage") as any;
    expect(state).toMatchObject({ id: "rage", name: "Rage" });
    expect(player.getState("rage")).toBe(state);
    expect(player.addState("rage")).toBeNull();
    player.removeState("rage");
    expect(player.getState("rage")).toBeUndefined();
  });
});
