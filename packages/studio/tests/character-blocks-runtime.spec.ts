import { describe, expect, test, vi } from 'vitest';
import { defaultBlocks } from '../runtime/blocks/blocks';
import { defaultExecutors } from '../runtime/blocks/executors';
import { call_character_select } from '../runtime/blocks/executors/call-character-select';
import { change_class } from '../runtime/blocks/executors/change-class';

const executionContext = (player: Record<string, any>, database: Record<string, any>) => ({
  player,
  event: null,
  map: { database: () => database },
} as any);

describe('character workflow blocks', () => {
  test('registers the character selector and class blocks', () => {
    const characterSelect = defaultBlocks.find((block) => block.type === 'call_character_select');
    const changeClass = defaultBlocks.find((block) => block.type === 'change_class');

    expect(characterSelect).toBeDefined();
    expect((characterSelect as any).schema.properties.actorIds.items.$ref).toBe('#/functions/actor');
    expect((characterSelect as any).schema.properties.allowCancel.default).toBe(false);
    expect(changeClass).toBeDefined();
    expect((changeClass as any).schema.properties.classId.$ref).toBe('#/functions/class');
    expect(defaultExecutors.call_character_select).toBe(call_character_select);
    expect(defaultExecutors.change_class).toBe(change_class);
  });

  test('offers the configured actors and applies the selected actor when RPGJS supports it', async () => {
    const selectedActorId = Object.assign(() => 'actor-1', { set: vi.fn() });
    const player = {
      studioSelectedActorId: selectedActorId,
      showCharacterSelect: vi.fn(async (actors) => actors[1]),
      changeActor: vi.fn(),
    };
    const database = {
      'actor-1': { _type: 'actor', name: 'Ayla', classId: 'class-1' },
      'actor-2': { _type: 'actor', name: 'Borin' },
      'class-1': { _type: 'class', name: 'Ranger' },
    };

    await call_character_select(executionContext(player, database), {
      allActors: false,
      actorIds: ['actor-2', 'actor-1'],
      allowCancel: true,
    });

    expect(player.showCharacterSelect).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'actor-2' }),
      expect.objectContaining({ id: 'actor-1', class: database['class-1'] }),
    ], { selectedActorId: 'actor-1', allowCancel: true });
    expect(player.changeActor).toHaveBeenCalledWith(expect.objectContaining({ id: 'actor-1' }));
    expect(selectedActorId.set).toHaveBeenCalledWith('actor-1');
  });

  test('does not execute actor switching before the required RPGJS API is installed', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(call_character_select(executionContext({}, {
      actor: { _type: 'actor', name: 'Ayla' },
    }), { allActors: true, actorIds: [], allowCancel: false })).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('requires an RPGJS version'));
    warn.mockRestore();
  });

  test('assigns a resolved class when the upgraded RPGJS API is available', async () => {
    const player = { changeActor: vi.fn(), setClass: vi.fn() };
    const runtimeClass = { _type: 'class', name: 'Mage' };

    await change_class(executionContext(player, { mage: runtimeClass }), { classId: 'mage' });

    expect(player.setClass).toHaveBeenCalledWith(runtimeClass);
  });

  test('assigns an RPGJS class constructor with the currently published API', async () => {
    class Mage {}
    const player = { setClass: vi.fn() };

    await change_class(executionContext(player, { mage: Mage }), { classId: 'mage' });

    expect(player.setClass).toHaveBeenCalledWith(Mage);
  });
});
