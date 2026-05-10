import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
const originalMathRandom = Math.random;
import { civTick, getActiveCivs } from '../src/server/civ/civ.engine';
import { H, updateHeuristics } from '../src/server/arelogic/heuristic.engine';

vi.mock('../src/server/arelogic/heuristic.engine', () => {
  return {
    H: new Array(13).fill(0),
    updateHeuristics: vi.fn(),
  };
});

vi.mock('../src/server/arelogic/graph.engine', () => {
  return {
    Graph: vi.fn().mockImplementation(function() {
      return {
        addNode: vi.fn(),
      };
    })
  };
});

vi.mock('../src/server/systems/dungeon.system', () => {
  return {
    createRuinDungeon: vi.fn()
  }
});

vi.mock('../src/server/systems/faction.system', () => {
  return {
    createFaction: vi.fn(),
    declareWar: vi.fn(),
    getAllFactions: vi.fn().mockReturnValue([])
  }
});

vi.mock('../src/server/systems/reputation.system', () => {
  return {
    addSocialLink: vi.fn()
  }
});

vi.mock('../src/server/civ/npc.ai', () => {
  return {
    updateNPCGoal: vi.fn()
  }
});

vi.mock('../src/server/systems/structure.system', () => {
  return {
    createStructure: vi.fn(),
    getAllStructures: vi.fn().mockReturnValue([]),
    damageStructure: vi.fn(),
    getGlobalStructureImpact: vi.fn().mockReturnValue(new Array(13).fill(0))
  }
});

describe('civ.engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // clear active civs
    const civs = getActiveCivs();
    while(civs.length > 0) {
      civs.pop();
    }
    for (let i = 0; i < 13; i++) {
        H[i] = 0;
    }
    Math.random = () => 0;
  });

  afterEach(() => {
    Math.random = originalMathRandom;
  });

  it('Growth logic creates farm when H[0] > 0.5', () => {
    H[0] = 0.6;
    civTick();
    expect(getActiveCivs().length).toBe(1);
  });

  it('Growth logic creates market when H[1] > 0.5', () => {
    H[1] = 0.6;
    civTick();
    expect(getActiveCivs().length).toBe(1);
  });

  it('Collapse logic works when H[6] > 0.8', () => {
    H[0] = 0.6; // create one
    civTick();
    expect(getActiveCivs().length).toBe(1);

    H[0] = 0;
    H[6] = 0.9;
    civTick();
    expect(getActiveCivs().length).toBe(0);
  });

  it('Collapse logic works when H[8] > 0.8', () => {
    H[0] = 0.6; // create one
    civTick();
    expect(getActiveCivs().length).toBe(1);

    H[0] = 0;
    H[8] = 0.9;
    civTick();
    expect(getActiveCivs().length).toBe(0);
  });

  it('Rebirth logic works when H[10] > 0.7 and H[1] > 0.4', () => {
    // Ensure only rebirth logic triggers, or account for other triggers.
    H[0] = 0; // Don't trigger farm growth
    H[10] = 0.8;
    H[1] = 0.6; // Triggers market growth too
    civTick();
    expect(getActiveCivs().length).toBe(2); // one for H[1] > 0.5 (market), one for rebirth
  });
});
