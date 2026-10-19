import { describe, expect, it } from 'vitest';
import { CharacterSpritesheet } from '../src/spritesheets/character';

const rowOf = (sheet: ReturnType<typeof CharacterSpritesheet>, direction: string) =>
  sheet.textures.walk.animations({ direction } as any)[0][0].frameY;

const sheet = (lanes?: Array<{ id?: string; direction?: string }>) =>
  CharacterSpritesheet({ id: 'walk', imageSource: 'walk.png', framesWidth: 4, framesHeight: 4, lanes });

describe('row of each direction in a character animation sheet', () => {
  // The Studio export (generateRPGJSTypeScript) and the Fal prompt rely on this fallback order.
  it('reads row 0 up, 1 left, 2 down, 3 right when the sheet declares no lanes', () => {
    const walk = sheet();
    expect(['up', 'left', 'down', 'right'].map((direction) => rowOf(walk, direction))).toEqual([0, 1, 2, 3]);
  });

  it('reads the rows in the order of the lanes, by direction', () => {
    const walk = sheet(['down', 'left', 'right', 'up'].map((direction) => ({ direction })));
    expect(['down', 'left', 'right', 'up'].map((direction) => rowOf(walk, direction))).toEqual([0, 1, 2, 3]);
  });

  it('reads the direction of a lane from the end of its id', () => {
    const walk = sheet(['walk-right', 'walk-up', 'walk-left', 'walk-down'].map((id) => ({ id })));
    expect(['right', 'up', 'left', 'down'].map((direction) => rowOf(walk, direction))).toEqual([0, 1, 2, 3]);
  });
});
