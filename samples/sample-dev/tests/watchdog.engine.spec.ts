import { vi, describe, it, expect, beforeEach } from 'vitest';
import { validate, normalize, getValidationStats } from '../src/server/arelogic/watchdog.engine';
import { H } from '../src/server/arelogic/heuristic.engine';
import { Graph } from '../src/server/arelogic/graph.engine';

vi.mock('../src/server/arelogic/heuristic.engine', () => {
  return {
    H: new Array(13).fill(0)
  };
});

// Since Graph is in the codebase, we'll mock it properly
vi.mock('../src/server/arelogic/graph.engine', () => {
  return {
    Graph: vi.fn().mockImplementation(function() {
      return {
        addNode: vi.fn(),
        addEdge: vi.fn(),
        relations: vi.fn(),
        value: vi.fn()
      };
    })
  };
});

describe('Watchdog Engine - Axiom Enforcements', () => {
  let graph: any;

  beforeEach(() => {
    vi.clearAllMocks();
    graph = new Graph();
    // Reset H
    for (let i = 0; i < 13; i++) {
      H[i] = 0;
    }
  });

  describe('A1 - Relational Integrity', () => {
    it('should pass if entity has no negative total relationship weight', () => {
      graph.value.mockReturnValue(50);
      const action = { type: 'test', entityId: 'entity1' };
      const result = validate(action, graph as any);
      expect(result.valid).toBe(true);
    });

    it('should fail if entity has dangerously low relationship weight (< -100)', () => {
      graph.value.mockReturnValue(-150);
      const action = { type: 'test', entityId: 'entity1' };
      const result = validate(action, graph as any);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('relational integrity');
    });

    it('should bypass check if no entityId is provided', () => {
      const action = { type: 'test' };
      const result = validate(action, graph as any);
      expect(result.valid).toBe(true);
    });
  });

  describe('A2 - Historical Persistence', () => {
    it('should pass if history is empty or null', () => {
      const action = { type: 'buy' };
      const result = validate(action, undefined, []);
      expect(result.valid).toBe(true);
    });

    it('should fail if suspicious rapid action pattern is detected', () => {
      const history = [
        { type: 'buy', timestamp: Date.now() - 500 },
        { type: 'sell', timestamp: Date.now() - 300 },
        { type: 'buy', timestamp: Date.now() - 100 }
      ];
      const action = { type: 'buy' };
      const result = validate(action, undefined, history);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('historical persistence');
    });

    it('should pass if rapid actions are not a suspicious pattern', () => {
      const history = [
        { type: 'move', timestamp: Date.now() - 500 },
        { type: 'move', timestamp: Date.now() - 300 },
        { type: 'move', timestamp: Date.now() - 100 }
      ];
      const action = { type: 'move' };
      const result = validate(action, undefined, history);
      expect(result.valid).toBe(true);
    });
  });

  describe('A3 - Emergent Complexity', () => {
    it('should fail if value is negative', () => {
      const action = { type: 'test', value: -10 };
      const result = validate(action);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('emergent complexity');
    });

    it('should fail if transfer amount is negative or zero', () => {
      const action = { type: 'transfer', amount: 0 };
      const result = validate(action);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('emergent complexity');
    });

    it('should fail if trade price is negative or zero', () => {
      const action = { type: 'trade', price: -5 };
      const result = validate(action);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('emergent complexity');
    });

    it('should pass for valid emergent complexity rules', () => {
      const action = { type: 'trade', price: 10 };
      const result = validate(action);
      expect(result.valid).toBe(true);
    });
  });

  describe('A4 - Watchdog Enforcement (Heuristic Boundaries)', () => {
    it('should fail if heuristic values are out of bounds (> 1)', () => {
      const action = { type: 'heuristic_update', newH: [1.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
      const result = validate(action);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('heuristic boundaries');
    });

    it('should fail if heuristic values are out of bounds (< 0)', () => {
      const action = { type: 'heuristic_update', newH: [-0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
      const result = validate(action);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('heuristic boundaries');
    });

    it('should fail if conflict (H8) is high and chaos (H10) is low', () => {
      H[7] = 0.95;
      H[9] = 0.5;
      const action = { type: 'conflict_action' };
      const result = validate(action);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('heuristic boundaries');
    });
  });

  describe('A5 - Continuous Ingestion (Event Vector)', () => {
    it('should fail if event vector is missing', () => {
      const action = { type: 'test', eventVector: null };
      const result = validate(action);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid event vector structure');
    });

    it('should fail if event vector length is not 13', () => {
      const action = { type: 'test', eventVector: [0, 1] };
      const result = validate(action);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid event vector structure');
    });

    it('should fail if event vector element is out of range (> 1)', () => {
      const E = new Array(13).fill(0);
      E[0] = 1.5;
      const action = { type: 'test', eventVector: E };
      const result = validate(action);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid event vector structure');
    });

    it('should fail if event vector element is out of range (< -1)', () => {
      const E = new Array(13).fill(0);
      E[0] = -1.5;
      const action = { type: 'test', eventVector: E };
      const result = validate(action);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid event vector structure');
    });

    it('should pass for valid event vector', () => {
      const E = new Array(13).fill(0);
      E[0] = 0.5;
      const action = { type: 'test', eventVector: E };
      const result = validate(action);
      expect(result.valid).toBe(true);
    });
  });

  describe('Normalize functionality', () => {
    it('should clamp negative values to 0', () => {
      const action = { type: 'test', value: -10, amount: -5 };
      const normalized = normalize(action);
      expect(normalized.value).toBe(0);
      expect(normalized.amount).toBe(0);
    });

    it('should clamp price to 1', () => {
      const action = { type: 'test', price: 0 };
      const normalized = normalize(action);
      expect(normalized.price).toBe(1);
    });

    it('should clamp heuristics array to [0, 1]', () => {
      const action = { type: 'heuristic_update', newH: [-0.5, 1.5, 0.5] };
      const normalized = normalize(action);
      expect(normalized.newH).toEqual([0, 1, 0.5]);
    });
  });

  describe('Stats functionality', () => {
    it('should compute valid stats', () => {
      const results = [
        { valid: true },
        { valid: false, normalized: {} },
        { valid: false }
      ];
      const stats = getValidationStats(results);
      expect(stats.total).toBe(3);
      expect(stats.valid).toBe(1);
      expect(stats.invalid).toBe(2);
      expect(stats.normalizable).toBe(1);
    });
  });
});
