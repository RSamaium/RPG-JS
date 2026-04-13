import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../src/server/persistence/state.store', () => ({
  saveState: vi.fn(),
  loadState: vi.fn(() => ({ H: new Array(13).fill(0) }))
}));

describe('Heuristic Engine', () => {
  let engine: any;

  beforeEach(async () => {
    vi.resetModules();
    engine = await import('../src/server/arelogic/heuristic.engine');
  });

  it('should initialize H with 0s', () => {
    expect(engine.H).toEqual(new Array(13).fill(0));
  });

  it('should update H correctly given E', () => {
    const E = new Array(13).fill(0);
    E[0] = 1; // Input to H1
    const newH = engine.updateHeuristics(E);
    expect(newH[0]).toBe(1);
    expect(engine.H[0]).toBe(1);
  });
});
