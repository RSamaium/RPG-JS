import { describe, expect, it } from 'vitest';
import { fitAnimationTimeline } from './animation-timing';

describe('combat animation timing', () => {
  it('preserves frames and fits the complete cycle including its end marker', () => {
    const source = [{ time: 0, frameX: 0, frameY: 1 }, { time: 10, frameX: 1, frameY: 1 }, { time: 20 }];
    expect(fitAnimationTimeline(source, 1000)).toEqual([
      { time: 0, frameX: 0, frameY: 1 }, { time: 30, frameX: 1, frameY: 1 }, { time: 60 },
    ]);
    expect(source[1].time).toBe(10);
  });
  it('holds a single pose until the phase ends', () => {
    expect(fitAnimationTimeline([{ time: 0, frameX: 0, frameY: 0 }], 500)).toEqual([
      { time: 0, frameX: 0, frameY: 0 }, { time: 30 },
    ]);
  });
  it('adds an end marker without dropping the last pose', () => {
    expect(fitAnimationTimeline([{ time: 0, frameX: 0 }, { time: 10, frameX: 1, frameY: 0 }], 1000).at(-1)).toEqual({ time: 60 });
  });
});
