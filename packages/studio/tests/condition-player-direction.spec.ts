import { describe, expect, it } from 'vitest';
import { evaluateConditionalBranch } from '../runtime/blocks/condition-evaluator';

const evaluate = (direction: unknown, expected: string) =>
  evaluateConditionalBranch(
    { conditionType: 'player', playerProperty: 'direction', playerDirection: expected } as any,
    { player: { direction } as any, event: null }
  );

describe('conditional branch on the player direction', () => {
  // RpgPlayer.direction is a signal: it must be called to read the direction.
  it('matches when the player direction is a signal returning the expected direction', () => {
    expect(evaluate(() => 'up', 'up')).toBe(true);
    expect(evaluate(() => 'left', 'left')).toBe(true);
  });

  it('does not match another direction', () => {
    expect(evaluate(() => 'down', 'up')).toBe(false);
  });

  it('still reads a plain string direction', () => {
    expect(evaluate('right', 'right')).toBe(true);
    expect(evaluate('right', 'left')).toBe(false);
  });
});
