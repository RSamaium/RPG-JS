import { vi, describe, it, expect, beforeEach } from 'vitest';
import { H, updateHeuristics } from '../src/server/arelogic/heuristic.engine';
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

  it('updateHeuristics should update H and call saveState', () => {
    const E = new Array(13).fill(0);
    E[0] = 1; // +H1

    const result = updateHeuristics(E);

    expect(result[0]).toBe(1);
    expect(H[0]).toBe(1);
    expect(saveState).toHaveBeenCalledWith({ H: result });
  });

  it('handleGetHeuristics should return current H', () => {
    const res = handleGetHeuristics();
    expect(res.H).toEqual(new Array(13).fill(0));
  });

  it('handlePostHeuristics should update heuristics directly when H is provided', () => {
    const newH = new Array(13).fill(1);
    const res = handlePostHeuristics({ H: newH }) as any;

    expect(res.message).toBe("Heuristics updated directly");
    expect(res.H).toEqual(newH);
    expect(H).toEqual(newH);
  });

  it('handlePostHeuristics should update heuristics via event vector E', () => {
    const E = new Array(13).fill(0);
    E[1] = 5; // +H2

    const res = handlePostHeuristics({ E }) as any;

    expect(res.message).toBe("Heuristics updated via event vector");
    expect(res.H[1]).toBe(5);
    expect(H[1]).toBe(5);
  });

  it('handlePostHeuristics should return error for invalid body', () => {
    const res = handlePostHeuristics({} as any) as any;
    expect(res.error).toBeDefined();
  });
});
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveState, loadState } from '../src/server/persistence/state.store';

vi.mock('../src/server/persistence/state.store', () => ({
  saveState: vi.fn(),
  loadState: vi.fn().mockReturnValue(null),
}));

import { updateHeuristics, H, M } from '../src/server/arelogic/heuristic.engine';
import { handleGetHeuristics, handlePostHeuristics } from '../src/server/api/heuristic.api';

describe('Heuristic Wave Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset H to all zeros before each test to ensure test isolation
    for (let i = 0; i < 13; i++) {
      H[i] = 0;
    }
  });

  describe('updateHeuristics', () => {
    it('should calculate new H correctly with given E', () => {
      const E = new Array(13).fill(0);
      E[0] = 1; // E[0] is 1

      // Initial H is all zeros, so next H should be just E
      const newH = updateHeuristics(E);

      expect(newH[0]).toBe(1);
      for (let i = 1; i < 13; i++) {
        expect(newH[i]).toBe(0);
      }
      expect(H[0]).toBe(1);
      expect(saveState).toHaveBeenCalledWith({ H: newH });
    });

    it('should apply influence matrix M correctly', () => {
      // Set H manually for testing M calculation
      H[0] = 1;
      const E = new Array(13).fill(0);

      const newH = updateHeuristics(E);

      // newH[i] = sum(M[i][j] * H[j]) + E[i]
      // since H[0] = 1, newH[i] = M[i][0]
      for (let i = 0; i < 13; i++) {
        expect(newH[i]).toBeCloseTo(M[i][0]);
      }
    });
  });

  describe('Heuristic API', () => {
    it('should return current H via handleGetHeuristics', () => {
      H[5] = 42;
      const result = handleGetHeuristics();
      expect(result.H).toBeDefined();
      expect(result.H[5]).toBe(42);
      expect(result.H).not.toBe(H); // should return a copy
    });

    it('should update H directly via handlePostHeuristics', () => {
      const newH = new Array(13).fill(0);
      newH[2] = 10;

      const result = handlePostHeuristics({ H: newH }) as { H: number[]; message: string };

      expect(result.message).toBe('Heuristics updated directly');
      expect(result.H[2]).toBe(10);
      expect(H[2]).toBe(10);
    });

    it('should update H via event vector E via handlePostHeuristics', () => {
      const E = new Array(13).fill(0);
      E[4] = 5;

      const result = handlePostHeuristics({ E }) as { H: number[]; message: string };

      expect(result.message).toBe('Heuristics updated via event vector');
      expect(result.H[4]).toBe(5);
      expect(H[4]).toBe(5);
    });

    it('should return error for invalid payload', () => {
      const result = handlePostHeuristics({ E: [1, 2] }) as { error: string }; // Invalid length
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Invalid request body');
    });
  });
});
