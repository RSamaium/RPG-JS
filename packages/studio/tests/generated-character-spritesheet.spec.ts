import { afterEach, describe, expect, test, vi } from 'vitest';
import { Assets, Texture } from 'pixi.js';
import { getGameDataProvider } from '../src/data-provider';
import * as proportions from '../src/character-proportions';
import { attachCharacterAnimations, createSpriteSheetObject, prepareSpriteSheetObject } from '../src/spritesheet-utils';

afterEach(() => vi.restoreAllMocks());

const idle = {
  _id: 'idle-1',
  type: 'spritesheet',
  fileName: 'idle.png',
  metadata: {
    generationMode: 'idle',
    columns: 2,
    rows: 2,
    idleDirections: ['down', 'left', 'right', 'up'],
    scale: 1.26,
  },
};

describe('generated character spritesheet', () => {
  test('aligns each direction at the ground and keeps transforms fixed during attacks', async () => {
    vi.spyOn(getGameDataProvider(), 'getMedia').mockResolvedValue(idle);
    vi.spyOn(Assets, 'load').mockResolvedValue(Texture.EMPTY);
    const pose = { width: 512, height: 384, top: 2, bottom: 356, centerX: 258 };
    const attackPose = { width: 256, height: 256, top: 91, bottom: 177, centerX: 143 };
    vi.spyOn(proportions, 'loadedCharacterFrames').mockImplementation(image =>
      image.endsWith('idle.png') ? [pose, pose, pose, pose] : Array.from({ length: 32 }, (_, i) =>
        i % 8 === 0 ? attackPose : { ...attackPose, top: 0, centerX: 200 }));
    const attack = await prepareSpriteSheetObject({
      type: 'spritesheet', fileName: 'attack.png',
      metadata: { groupId: idle._id, frameWidth: 8, frameHeight: 4 },
    });
    const frames = attack.textures.attack.animations({ direction: 'left' })[0];
    const first = frames[0];
    expect(first.scale[1] * 86).toBeCloseTo(354);
    expect(attack.displayScale).toBeCloseTo(128 / 512 * 1.26);
    // The visible bottom equals the anchor's ground, regardless of padding.
    const ground = 256 - (256 - first.spriteRealSize.height) / 2;
    expect(ground).toBe(177);
    expect((143 - 128) * first.scale[0] + first.x).toBeCloseTo(0);
    for (const frame of frames) {
      expect(frame.scale).toEqual(first.scale);
      expect(frame.x).toBe(first.x);
      expect(frame.spriteRealSize).toEqual(first.spriteRealSize);
    }
  });

  test('matches linked walk and idle in all directions and resets offsets on return to idle', async () => {
    const directions = ['down', 'left', 'right', 'up'];
    vi.spyOn(getGameDataProvider(), 'getMediaGroup').mockResolvedValue([{
      type: 'spritesheet', fileName: 'walk.png',
      metadata: { groupId: idle._id, name: 'walk', frameWidth: 8, frameHeight: 4,
        lanes: directions.map(direction => ({ direction })) },
    }]);
    vi.spyOn(Assets, 'load').mockResolvedValue(Texture.EMPTY);
    const poses = directions.map((_, i) => ({ width: 512, height: 384, top: 5, bottom: 305 + i * 10, centerX: 256 }));
    const walkPoses = Array.from({ length: 32 }, (_, i) => ({ width: 256, height: 256, top: 20, bottom: 120 + Math.floor(i / 8) * 5, centerX: 140 }));
    vi.spyOn(proportions, 'loadedCharacterFrames').mockImplementation(image => image.endsWith('idle.png') ? poses : walkPoses);
    const sheet = await prepareSpriteSheetObject(idle);
    for (const [i, direction] of directions.entries()) {
      const walking = sheet.textures.walk.animations({ direction })[0][0];
      const standing = sheet.textures.stand.animations({ direction })[0][0];
      expect(walking.scale[1] * (100 + i * 5)).toBeCloseTo(300 + i * 10);
      expect(standing.scale).toEqual([1, 1]);
      expect(standing.x).toBe(0);
      expect(standing.y).toBe(0);
      expect(384 - (384 - standing.spriteRealSize.height) / 2).toBe(poses[i].bottom);
    }
  });

  test('reads independent cell bounds and ignores transparent pixels', () => {
    const pixels = { width: 8, height: 6, data: new Uint8ClampedArray(8 * 6 * 4) };
    for (let y = 2; y < 5; y++) pixels.data[(y * 8 + 1) * 4 + 3] = 255;
    pixels.data[7 * 4 + 3] = 16;
    expect(proportions.characterFrameBounds(pixels, 2, 1)).toEqual([
      { width: 4, height: 6, top: 2, bottom: 5, centerX: 1.5 }, undefined,
    ]);
  });

  test('normalizes a separately played attack against its idle parent', async () => {
    const base = { ...idle, metadata: { ...idle.metadata, scale: 0.79 } };
    vi.spyOn(getGameDataProvider(), 'getMedia').mockResolvedValue(base);
    const load = vi.spyOn(Assets, 'load').mockResolvedValue(Texture.EMPTY);
    vi.spyOn(proportions, 'loadedCharacterHeight').mockImplementation((image) => image.endsWith('idle.png') ? 300 : 150);
    const attack = await prepareSpriteSheetObject({
      _id: 'attack-1', type: 'spritesheet', fileName: 'attack.png',
      metadata: { groupId: idle._id, name: 'attack', scale: 1, frameWidth: 8, frameHeight: 4 },
    });
    const idleSheet = await createSpriteSheetObject(base);
    expect(150 * attack.displayScale).toBeCloseTo(300 * idleSheet.displayScale);
    expect(load).toHaveBeenCalledWith(expect.stringContaining('idle.png'));
    expect(load).toHaveBeenCalledWith(expect.stringContaining('attack.png'));
    expect(attack.textures.attack).toBeDefined();
  });

  test('measures the median visible height, ignoring empty frames and faint alpha', () => {
    const pixels = { width: 6, height: 4, data: new Uint8ClampedArray(6 * 4 * 4) };
    for (let y = 1; y < 4; y++) pixels.data[(y * 6) * 4 + 3] = 255;
    for (let y = 2; y < 4; y++) pixels.data[(y * 6 + 2) * 4 + 3] = 255;
    pixels.data[4 * 4 + 3] = 16;
    expect(proportions.visibleCharacterHeight(pixels, 3, 1)).toBe(3);
  });

  test('keeps idle and walk the same visible size even when both saved scales are identical', async () => {
    const base = { ...idle, metadata: { ...idle.metadata, scale: 0.79 } };
    vi.spyOn(getGameDataProvider(), 'getMediaGroup').mockResolvedValue([{
      _id: 'walk-1', type: 'spritesheet', fileName: 'walk.png',
      metadata: { groupId: idle._id, name: 'walk', scale: 0.79, frameWidth: 8, frameHeight: 4 },
    }]);
    vi.spyOn(Assets, 'load').mockResolvedValue(Texture.EMPTY);
    vi.spyOn(proportions, 'loadedCharacterHeight').mockImplementation((image) => image.endsWith('idle.png') ? 300 : 200);
    const sheet = await prepareSpriteSheetObject(base);
    const idleSize = 300 * sheet.displayScale * sheet.scale[1];
    const walkSize = 200 * sheet.displayScale * sheet.textures.walk.scale[1];
    expect(walkSize).toBeCloseTo(idleSize);
    expect(sheet.displayScale).toBeCloseTo(128 / 512 * 0.79);
  });

  test('uses valid cells for each idle direction without animating the pose', async () => {
    const sheet = await createSpriteSheetObject(idle);
    expect([sheet.framesWidth, sheet.framesHeight]).toEqual([2, 2]);
    expect(sheet.displayScale).toBe(1.26 * 128 / 512);
    for (const [direction, frameX, frameY] of [
      ['down', 0, 0], ['left', 1, 0], ['right', 0, 1], ['up', 1, 1],
    ] as const) {
      expect(sheet.textures.stand.animations({ direction })).toEqual([[{ time: 0, frameX, frameY }]]);
      expect(sheet.textures.walk.animations({ direction })).toEqual([[{ time: 0, frameX, frameY }]]);
    }
  });

  test('plays a linked walk sheet at its saved proportional scale', async () => {
    const sheet = await createSpriteSheetObject(idle);
    const result = await attachCharacterAnimations(sheet, idle, [{
      _id: 'walk-1',
      type: 'spritesheet',
      fileName: 'walk.png',
      metadata: {
        groupId: 'idle-1', name: 'walk', frameWidth: 8, frameHeight: 4,
        lanes: [
          { id: 'walk-down' }, { id: 'walk-left' },
          { id: 'walk-right' }, { id: 'walk-up' },
        ],
        scale: 1.92,
      },
    }]);
    expect(result.textures.stand).toBe(sheet.textures.stand);
    expect(result.textures.walk).toMatchObject({
      image: expect.stringContaining('walk.png'),
      framesWidth: 8,
      framesHeight: 4,
      scale: [1.92 / 1.26, 1.92 / 1.26],
    });
    expect(result.textures.walk.animations({ direction: 'down' })[0][0]).toMatchObject({ frameX: 0, frameY: 0 });
    // CanvasEngine retains the previous transform when both the texture and
    // root omit scale. Returning to stand must explicitly restore unit scale.
    expect(result.textures.stand.scale ?? result.scale).toEqual([1, 1]);
  });

  test('waits for idle and linked animation images before making the character available', async () => {
    const walk = {
      _id: 'walk-1', type: 'spritesheet', fileName: 'walk.png',
      metadata: { groupId: idle._id, name: 'walk', scale: 1.92 },
    };
    vi.spyOn(getGameDataProvider(), 'getMediaGroup').mockResolvedValue([walk]);
    let finishWalk!: (texture: Texture) => void;
    const walkImage = new Promise<Texture>((resolve) => { finishWalk = resolve; });
    const load = vi.spyOn(Assets, 'load').mockImplementation((source) =>
      String(source).endsWith('walk.png') ? walkImage : Promise.resolve(Texture.EMPTY));
    let ready = false;
    const preparation = prepareSpriteSheetObject(idle, idle._id).then((sheet) => {
      ready = true;
      return sheet;
    });
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    expect(load).toHaveBeenCalledWith(expect.stringContaining('idle.png'));
    expect(load).toHaveBeenCalledWith(expect.stringContaining('walk.png'));
    expect(ready).toBe(false);
    finishWalk(Texture.EMPTY);
    const sheet = await preparation;
    expect(ready).toBe(true);
    expect(sheet.textures.walk.image).toContain('walk.png');
  });
});
