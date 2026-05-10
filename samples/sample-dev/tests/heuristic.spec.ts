import { vi, describe, it, expect, beforeEach } from 'vitest';
import { H, M, updateHeuristics } from '../src/server/arelogic/heuristic.engine';
import { handleGetHeuristics, handlePostHeuristics } from '../src/server/api/heuristic.api';
import { validate, normalize, ValidationResult } from '../src/server/arelogic/watchdog.engine';
import { Graph } from '../src/server/arelogic/graph.engine';
import { generateChunk } from '../src/server/world/world.generator';
import { getChunk } from '../src/server/world/chunk.system';
import { saveState, loadState } from '../src/server/persistence/state.store';
import { saveChunk, loadChunk } from '../src/server/persistence/world.store';

vi.mock('../src/server/persistence/state.store', () => ({
  saveState: vi.fn(),
  loadState: vi.fn(() => ({ H: new Array(13).fill(0) }))
}));

vi.mock('../src/server/persistence/world.store', () => ({
  saveChunk: vi.fn(),
  loadChunk: vi.fn().mockResolvedValue(null)
}));

describe('Heuristical Game Features', () => {
  beforeEach(() => {
    // Manually reset state to guarantee test isolation and prevent side effects
    for (let i = 0; i < 13; i++) {
        H[i] = 0;
    }
    vi.clearAllMocks();
  });

  describe('updateHeuristics', () => {
    it('should calculate new H correctly with given E', () => {
      const E = new Array(13).fill(0);
      E[0] = 1;

      const newH = updateHeuristics(E);

      expect(newH[0]).toBe(1);
      for (let i = 1; i < 13; i++) {
        expect(newH[i]).toBe(0);
      }
      expect(H[0]).toBe(1);
      expect(saveState).toHaveBeenCalledWith({ H: newH });
    });

    it('should apply influence matrix M correctly', () => {
      H[0] = 1;
      const E = new Array(13).fill(0);

      const newH = updateHeuristics(E);

      for (let i = 0; i < 13; i++) {
        expect(newH[i]).toBeCloseTo(M[i][0]);
      }
    });
  });

  describe('Heuristic API', () => {
    it('handleGetHeuristics should return current H', () => {
      H[5] = 42;
      const res = handleGetHeuristics();
      expect(res.H).toBeDefined();
      expect(res.H[5]).toBe(42);
      expect(res.H).not.toBe(H);
    });

    it('handlePostHeuristics should update heuristics directly when H is provided', () => {
      const newH = new Array(13).fill(1);
      newH[2] = 10;
      const res = handlePostHeuristics({ H: newH }) as any;

      expect(res.message).toBe("Heuristics updated directly");
      expect(res.H[2]).toBe(10);
      expect(H[2]).toBe(10);
    });

    it('handlePostHeuristics should update heuristics via event vector E', () => {
      const E = new Array(13).fill(0);
      E[1] = 5;

      const res = handlePostHeuristics({ E }) as any;

      expect(res.message).toBe("Heuristics updated via event vector");
      expect(res.H[1]).toBe(5);
      expect(H[1]).toBe(5);
    });

    it('handlePostHeuristics should return error for invalid payload', () => {
      const res = handlePostHeuristics({ E: [1, 2] } as any) as any;
      expect(res.error).toBeDefined();
      expect(res.error).toContain("Invalid request body");
    });
  });

  describe('Heuristic Evolution (H1-H13)', () => {
    it('harvesting increases H1 and H7, validating resource scaling', () => {
        // Harvesting typical event vector mapping based on event.mapper.ts
        const E = [0.5,0.2,0,0,0,0,0.3,0,0,0,0,0,0];
        const newH = updateHeuristics(E);

        expect(newH[0]).toBe(0.5); // H1 Resource Influx
        expect(newH[6]).toBe(0.3); // H7 Scarcity
    });

    it('combat action affects H9 (Conflict)', () => {
        const E = [0,0.1,0.2,0.2,0,0,0,0,0.2,0,0,0,0];
        const newH = updateHeuristics(E);

        expect(newH[8]).toBe(0.2); // H9 Conflict
    });
  });

  describe('Watchdog Constraints (A1-A5)', () => {
    it('validates relational integrity (A1)', () => {
       const graph = new Graph();
       graph.addNode({ id: 'npc1' });
       // Normal weight
       graph.addEdge({ source: 'npc1', target: 'player1', weight: 10 });

       let result = validate({ entityId: 'npc1' }, graph);
       expect(result.valid).toBe(true);

       // Dangerous low weight
       graph.addEdge({ source: 'npc1', target: 'player1', weight: -120 });
       result = validate({ entityId: 'npc1' }, graph);
       expect(result.valid).toBe(false);
       expect(result.reason).toContain('relational integrity');
    });

    it('validates historical persistence (A2) to catch rapid reversals', () => {
        const history = [
            { type: 'buy', timestamp: Date.now() - 500 },
            { type: 'sell', timestamp: Date.now() - 200 },
        ];

        const action = { type: 'buy', timestamp: Date.now() };
        history.push(action);

        const result = validate(action, undefined, history);
        expect(result.valid).toBe(false);
        expect(result.reason).toContain('historical persistence');
    });

    it('validates emergent complexity (A3) negative prices', () => {
        const action = { type: 'trade', price: -50 };
        const result = validate(action);

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('emergent complexity');
        expect(result.normalized).toBeDefined();
        expect(result.normalized?.price).toBe(1); // Normalization clamps min price to 1
    });

    it('validates heuristic boundaries (A4) out of bounds', () => {
        const newH = new Array(13).fill(0);
        newH[0] = 1.5; // Out of [0, 1] bounds

        const action = { type: 'heuristic_update', newH };
        const result = validate(action);

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('heuristic boundaries');
    });

    it('validates continuous ingestion (A5) invalid event vector structure', () => {
        const action = { eventVector: [0.5, 0.5] }; // Invalid length
        const result = validate(action);

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('event vector structure');
    });
  });

  describe('World Generation & Chunk System', () => {
      it('generateChunk generates biome based on heuristics (Scarcity -> Desert)', () => {
          const mockH = new Array(13).fill(0);
          mockH[6] = 0.8; // H7 Scarcity > 0.7 -> Desert

          const chunk = generateChunk(0, 0, mockH);
          expect(chunk.biome).toBe('desert');
          expect(chunk.tiles.length).toBe(32 * 32);
      });

      it('getChunk saves the chunk correctly when generated', async () => {
          // Clear cache (simulate empty cache)
          const chunkSystem = await import('../src/server/world/chunk.system');

          // Setting H heuristic for the global state for test
          H[0] = 0.7; // H1 Resource Influx > 0.6 -> Forest

          const chunk = await chunkSystem.getChunk(1, 1);

          expect(chunk.biome).toBe('forest');
          expect(saveChunk).toHaveBeenCalledWith(chunk.id, chunk); // Validates signature match
      });
  });
});
