import { describe, expect, test } from 'vitest';
import { resolveCharacterAnimation } from './character-animation';

describe('character animation reconciliation', () => {
  test.each(['stand', 'walk'])('keeps the full attack despite a synchronized %s update', (name) => {
    expect(resolveCharacterAnimation(name, false, false, false, true, 'attack')).toBe('attack');
  });

  test('returns to idle when the attack restores an old walk state after stopping', () => {
    expect(resolveCharacterAnimation('walk', false, false, true, false)).toBe('stand');
  });

  test('resumes walking when movement is still held after the attack', () => {
    expect(resolveCharacterAnimation('stand', false, true, true, false)).toBe('walk');
  });

  test('does not resume walking while controls remain locked', () => {
    expect(resolveCharacterAnimation('walk', false, true, false, false)).toBe('stand');
  });
});
