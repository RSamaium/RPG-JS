import { describe, it, expect, beforeEach, vi } from 'vitest';
import { H, updateHeuristics } from '../src/server/arelogic/heuristic.engine';
import { handleGetHeuristics, handlePostHeuristics } from '../src/server/api/heuristic.api';
import { saveState } from '../src/server/persistence/state.store';
import { handleAction } from '../src/server/hooks/playerActions';
import * as eventMapper from '../src/server/arelogic/event.mapper';

vi.mock('../src/server/persistence/state.store', () => ({
  saveState: vi.fn(),
  loadState: vi.fn(() => ({ H: new Array(13).fill(0) }))
}));

vi.mock('../src/server/arelogic/watchdog.engine', () => ({
  validate: vi.fn((action) => {
    // Mock basic validation: reject actions with extreme heuristic spikes as per Watchdog Extension
    if (action.eventVector) {
        const sum = action.eventVector.reduce((a:number, b:number) => a + b, 0);
        if (sum > 5) return { valid: false, reason: "Extreme heuristic spike" };
    }
    return { valid: true };
  })
}));

describe('Heuristic Game Features', () => {
  beforeEach(() => {
    for (let i = 0; i < 13; i++) {
        H[i] = 0;
    }
    vi.clearAllMocks();
  });

  describe('Player Actions to Heuristic Engine Integration', () => {
    it('should update heuristics correctly on handleAction("harvest")', () => {
      // Mock the mapActionToE to return the harvest vector
      const spyMapActionToE = vi.spyOn(eventMapper, 'mapActionToE');

      const action = { type: 'harvest' };
      const handledAction = handleAction(action);

      expect(handledAction).toEqual(action);
      // Verify mapActionToE was called
      expect(spyMapActionToE).toHaveBeenCalledWith('harvest');

      // Verify heuristics were updated based on the harvest vector
      // Harvest vector: [0.5,0.2,0,0,0,0,0.3,0,0,0,0,0,0]
      // Initial H is [0...], so next H is just the vector
      expect(H[0]).toBe(0.5); // H1 (index 0) Resource Influx
      expect(H[6]).toBe(0.3); // H7 (index 6) Scarcity
    });

    it('should update heuristics correctly on handleAction("trade")', () => {
      const spyMapActionToE = vi.spyOn(eventMapper, 'mapActionToE');

      const action = { type: 'trade' };
      const handledAction = handleAction(action);

      expect(handledAction).toEqual(action);
      expect(spyMapActionToE).toHaveBeenCalledWith('trade');

      // Trade vector: [0,0,0.3,0.5,0.2,0,0,0,0,0,0,0,0]
      expect(H[2]).toBe(0.3); // H3 (index 2) Market Velocity
      expect(H[3]).toBe(0.5); // H4 (index 3) Stability
    });

    it('should reject actions that produce extreme heuristic spikes', () => {
       const action = { type: 'extreme', eventVector: new Array(13).fill(1) }; // sum = 13
       const handledAction = handleAction(action);

       // Watchdog should reject it
       expect(handledAction).toBeNull();
       // H should not be updated
       expect(H).toEqual(new Array(13).fill(0));
    });
  });

  describe('Heuristic API', () => {
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
});
