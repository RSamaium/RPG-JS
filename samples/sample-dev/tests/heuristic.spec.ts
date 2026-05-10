import { vi, describe, it, expect, beforeEach } from 'vitest';
import { H, M, updateHeuristics } from '../src/server/arelogic/heuristic.engine';
import { handleGetHeuristics, handlePostHeuristics } from '../src/server/api/heuristic.api';
import { saveState } from '../src/server/persistence/state.store';

vi.mock('../src/server/persistence/state.store', () => ({
  saveState: vi.fn(),
  loadState: vi.fn(() => ({ H: new Array(13).fill(0) }))
}));

describe('Heuristic Game Features', () => {
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
});
