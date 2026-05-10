import { vi, describe, it, expect, beforeEach } from 'vitest';
import { civTick, getActiveCivs } from '../../src/server/civ/civ.engine';
import { H, updateHeuristics } from '../../src/server/arelogic/heuristic.engine';

vi.mock('../../src/server/arelogic/heuristic.engine', () => {
  const H = new Array(13).fill(0);
  return {
    H,
    updateHeuristics: vi.fn((E: number[]) => {
      // Keep H zeroed out, we test updates via mock analysis
      return H;
    })
  };
});

vi.mock('../../src/server/arelogic/graph.engine', () => {
  return {
    Graph: vi.fn().mockImplementation(function() { return {
      addNode: vi.fn(),
      addEdge: vi.fn()
    }; })
  };
});

vi.mock('../../src/server/systems/dungeon.system', () => ({
  createRuinDungeon: vi.fn()
}));

vi.mock('../../src/server/systems/faction.system', () => ({
  createFaction: vi.fn(),
  declareWar: vi.fn(),
  getAllFactions: vi.fn(() => [])
}));

vi.mock('../../src/server/systems/reputation.system', () => ({
  addSocialLink: vi.fn()
}));

vi.mock('../../src/server/civ/npc.ai', () => ({
  updateNPCGoal: vi.fn()
}));

vi.mock('../../src/server/systems/structure.system', () => ({
  createStructure: vi.fn(),
  getAllStructures: vi.fn(() => []),
  damageStructure: vi.fn(),
  getGlobalStructureImpact: vi.fn(() => new Array(13).fill(0))
}));

describe('Heuristic Game Features - Civ Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset H
    for (let i = 0; i < 13; i++) {
      H[i] = 0;
    }
    // Clear active civs
    getActiveCivs().length = 0;
  });

  it('should not grow if H0 is low', () => {
    civTick();
    expect(getActiveCivs().length).toBe(0);
    expect(updateHeuristics).toHaveBeenCalledWith(new Array(13).fill(0));
  });

  it('should grow a new civ if H0 > 0.5', () => {
    H[0] = 0.6; // Growth threshold
    civTick();
    expect(getActiveCivs().length).toBe(1);
    expect(getActiveCivs()[0].startsWith('civ_')).toBe(true);

    // Check if E[1] += 0.1
    const expectedE = new Array(13).fill(0);
    expectedE[1] = 0.1;
    expect(updateHeuristics).toHaveBeenCalledWith(expectedE);
  });

  it('should trigger rebirth if H10 > 0.7 and H1 > 0.4', () => {
    H[10] = 0.8;
    H[1] = 0.5;

    civTick();

    expect(getActiveCivs().length).toBe(1);
    expect(getActiveCivs()[0].startsWith('rebirth_')).toBe(true);

    const expectedE = new Array(13).fill(0);
    expectedE[2] = 0; // H[1] is 0.5, so H[1] > 0.5 is false
    expectedE[10] = 0.1; // Due to rebirth
    expectedE[5] = 0.1; // Due to rebirth
    expect(updateHeuristics).toHaveBeenCalledWith(expectedE);
  });

  it('should collapse a civ if H6 > 0.8', () => {
    H[0] = 0.6;
    civTick();
    expect(getActiveCivs().length).toBe(1);

    // Reset E calculation state for next tick
    (updateHeuristics as any).mockClear();

    // Trigger collapse
    H[0] = 0;
    H[6] = 0.9;
    civTick();

    expect(getActiveCivs().length).toBe(0); // Civ removed

    const expectedE = new Array(13).fill(0);
    expectedE[11] = 0.3; // Collapse chaos
    expectedE[7] = 0.2; // Collapse famine
    expect(updateHeuristics).toHaveBeenCalledWith(expectedE);
  });
});
