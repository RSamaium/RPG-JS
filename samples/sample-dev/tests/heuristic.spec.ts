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
