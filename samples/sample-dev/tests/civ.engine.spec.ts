import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { H, updateHeuristics } from '../src/server/arelogic/heuristic.engine';

// --- Mocks ---

vi.mock('../src/server/arelogic/heuristic.engine', () => {
  const actualH = new Array(13).fill(0);
  return {
    H: actualH,
    updateHeuristics: vi.fn((E: number[]) => {
      return actualH.map((v, i) => v + (E[i] || 0));
    })
  };
});

// Mock Graph using inline factory only
vi.mock('../src/server/arelogic/graph.engine', () => {
  return {
    Graph: class MockGraph {
      addNode = vi.fn();
      addEdge = vi.fn();
      relations = vi.fn();
      value = vi.fn();
    }
  };
});

vi.mock('../src/server/systems/dungeon.system', () => ({
  createRuinDungeon: vi.fn()
}));

vi.mock('../src/server/systems/faction.system', () => ({
  createFaction: vi.fn(),
  declareWar: vi.fn(),
  getAllFactions: vi.fn()
}));

vi.mock('../src/server/systems/reputation.system', () => ({
  addSocialLink: vi.fn()
}));

vi.mock('../src/server/civ/npc.ai', () => ({
  updateNPCGoal: vi.fn()
}));

vi.mock('../src/server/systems/structure.system', () => ({
  createStructure: vi.fn(),
  getAllStructures: vi.fn(),
  damageStructure: vi.fn(),
  getGlobalStructureImpact: vi.fn()
}));

import { civTick, getActiveCivs } from '../src/server/civ/civ.engine';

describe('Civ Engine - Heuristical Game Features', () => {
  let originalMathRandom: typeof Math.random;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset global H state
    for(let i=0; i<13; i++) {
        H[i] = 0;
    }

    getActiveCivs().length = 0;

    const structureSystem = await import('../src/server/systems/structure.system');
    (structureSystem.getGlobalStructureImpact as any).mockReturnValue(new Array(13).fill(0));
    (structureSystem.getAllStructures as any).mockReturnValue([]);

    const factionSystem = await import('../src/server/systems/faction.system');
    (factionSystem.getAllFactions as any).mockReturnValue([]);

    originalMathRandom = Math.random;
    Math.random = () => 0.99; // Default mock for Math.random to always pass > 0.98 checks
  });

  afterEach(() => {
    Math.random = originalMathRandom;
  });

  it('should apply global structure impact to event vector E', async () => {
    const impact = new Array(13).fill(0);
    impact[0] = 0.5;
    const structureSystem = await import('../src/server/systems/structure.system');
    (structureSystem.getGlobalStructureImpact as any).mockReturnValue(impact);

    civTick();

    expect(updateHeuristics).toHaveBeenCalledWith(expect.arrayContaining([0.5, ...new Array(12).fill(0)]));
  });

  it('should have NPCs build outposts when H9 (Order) is high', async () => {
    H[9] = 0.8;
    const structureSystem = await import('../src/server/systems/structure.system');

    civTick();

    expect(structureSystem.createStructure).toHaveBeenCalledWith('outpost', expect.any(String), 'order');
  });

  it('should have NPCs build barricades when H8 (Conflict) is high', async () => {
    H[8] = 0.8;
    const structureSystem = await import('../src/server/systems/structure.system');

    civTick();

    expect(structureSystem.createStructure).toHaveBeenCalledWith('barricade', expect.any(String), 'chaos');
  });

  it('should have NPCs build tradeposts when H3 (Economy) is high', async () => {
    H[3] = 0.8;
    const structureSystem = await import('../src/server/systems/structure.system');

    civTick();

    expect(structureSystem.createStructure).toHaveBeenCalledWith('tradepost', expect.any(String), 'neutral');
  });

  it('should damage structures when H11 (Chaos) is high', async () => {
    H[11] = 0.7;
    const structureSystem = await import('../src/server/systems/structure.system');
    (structureSystem.getAllStructures as any).mockReturnValue([{ id: 'struct_1' }]);
    Math.random = () => 0.05;

    civTick();

    expect(structureSystem.damageStructure).toHaveBeenCalledWith('struct_1', 10);
  });

  it('should process growth logic (farm creation) when H0 > 0.5', async () => {
    H[0] = 0.6;

    civTick();

    expect(getActiveCivs().length).toBeGreaterThan(0);
  });

  it('should create social links when multiple civs exist', async () => {
    H[0] = 0.6;

    civTick();
    civTick();

    const reputationSystem = await import('../src/server/systems/reputation.system');
    expect(reputationSystem.addSocialLink).toHaveBeenCalled();
  });

  it('should update NPC goals for active civs', async () => {
    H[0] = 0.6;
    civTick();

    const npcAI = await import('../src/server/civ/npc.ai');
    (npcAI.updateNPCGoal as any).mockClear();

    Math.random = () => 0.8;
    civTick();

    expect(npcAI.updateNPCGoal).toHaveBeenCalledWith(expect.any(String), 1);
  });

  it('should process market creation when H1 > 0.5', async () => {
    H[1] = 0.6;

    civTick();

    expect(getActiveCivs().length).toBeGreaterThan(0);
  });

  it('should create a new faction when H11 and H1 are high', async () => {
    H[11] = 0.9;
    H[1] = 0.4;
    const factionSystem = await import('../src/server/systems/faction.system');
    (factionSystem.createFaction as any).mockReturnValue(true);

    civTick();

    expect(factionSystem.createFaction).toHaveBeenCalled();
  });

  it('should declare war between factions when H8 is high', async () => {
    H[8] = 0.8;
    const factionSystem = await import('../src/server/systems/faction.system');

    // War declaration logic randomly picks two factions.
    // We override random to return 0 and 0.99 for indices to guarantee picking f1 and f2.
    // Ensure we also pass the f1.id !== f2.id check.

    Math.random = vi.fn()
      .mockReturnValueOnce(0.99) // build structures Math.random() > 0.98 -> barricade
      .mockReturnValueOnce(0.99) // chunk id
      .mockReturnValueOnce(0.99) // Math.random() > 0.9 (war declare)
      .mockReturnValueOnce(0.0)  // index 0 -> f1
      .mockReturnValueOnce(0.99); // index 1 -> f2

    (factionSystem.getAllFactions as any).mockReturnValue([{id: 'f1'}, {id: 'f2'}]);
    (factionSystem.declareWar as any).mockReturnValue(true);

    civTick();

    expect(factionSystem.declareWar).toHaveBeenCalledWith('f1', 'f2');
  });

  it('should collapse a civ and create ruin dungeon when H6 (Hunger) is high', async () => {
    H[0] = 0.6;
    civTick();
    const civId = getActiveCivs()[0];
    H[0] = 0;

    H[6] = 0.9;

    civTick();

    const dungeonSystem = await import('../src/server/systems/dungeon.system');
    expect(dungeonSystem.createRuinDungeon).toHaveBeenCalledWith(civId);
    expect(getActiveCivs()).not.toContain(civId);
  });

  it('should collapse a civ and create ruin dungeon when H8 (Conflict) is high', async () => {
     H[0] = 0.6;
     civTick();
     const civId = getActiveCivs()[0];
     H[0] = 0;

     H[8] = 0.9;
     // The war logic triggers when H8 > 0.7, which consumes Math.random() calls.
     Math.random = () => 0.0; // Fail the war logic condition `Math.random() > 0.9` to not crash

     civTick();

     const dungeonSystem = await import('../src/server/systems/dungeon.system');
     expect(dungeonSystem.createRuinDungeon).toHaveBeenCalledWith(civId);
     expect(getActiveCivs()).not.toContain(civId);
  });

  it('should process rebirth logic (capital creation) when H10 and H1 are high', async () => {
    H[10] = 0.8;
    H[1] = 0.5;

    civTick();

    expect(getActiveCivs().length).toBeGreaterThan(0);
  });

});
