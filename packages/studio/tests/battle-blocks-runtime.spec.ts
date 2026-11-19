import { afterEach, describe, expect, test, vi } from 'vitest';
import { testing, type TestingFixture } from '@rpgjs/testing';
import { createModule, defineModule } from '@rpgjs/common';
import type { RpgPlayer, RpgServer } from '@rpgjs/server';
import { defaultBlocks } from '../runtime/blocks/blocks';
import { defaultExecutors } from '../runtime/blocks/executors';
import { BATTLE_OUTCOME_VALUES, runBattleHook, schemaStartBattle, start_battle } from '../runtime/blocks/executors/start-battle';
import { schemaStartTurnBattle, start_turn_battle } from '../runtime/blocks/executors/start-turn-battle';
import { schemaStartTacticalBattle, start_tactical_battle } from '../runtime/blocks/executors/start-tactical-battle';

type Observer = { next?: (value: unknown) => void; error?: (error: unknown) => void; complete?: () => void };
/** What `callHooks` returns: an observable the block subscribes to. */
const observable = (run: (observer: Required<Observer>) => void) => ({
  subscribe: (observer: Observer) => run({ next: () => {}, error: () => {}, complete: () => {}, ...observer }),
});

/** A player whose battle hook answers with the results of the modules that implement it, as `callHooks` does. */
const playerAnswering = (...results: unknown[]) => {
  const variables = new Map<string, unknown>();
  const callHooks = vi.fn(() => observable((subscriber) => {
    subscriber.next(results);
    subscriber.complete();
  }));
  return {
    player: { hooks: { callHooks }, setVariable: (id: string, value: unknown) => variables.set(id, value) },
    callHooks,
    variables,
  };
};

describe('battle blocks', () => {
  test('are registered with their executors, and offer the outcome variable', () => {
    expect(defaultBlocks.find((block) => block.type === 'start_battle')).toBe(schemaStartBattle);
    expect(defaultBlocks.find((block) => block.type === 'start_turn_battle')).toBe(schemaStartTurnBattle);
    expect(defaultBlocks.find((block) => block.type === 'start_tactical_battle')).toBe(schemaStartTacticalBattle);
    expect(defaultExecutors.start_battle).toBe(start_battle);
    expect(defaultExecutors.start_turn_battle).toBe(start_turn_battle);
    expect(defaultExecutors.start_tactical_battle).toBe(start_tactical_battle);
    for (const schema of [schemaStartBattle, schemaStartTurnBattle, schemaStartTacticalBattle]) {
      expect(schema.schema.required).toEqual(['troopId']);
      expect(schema.schema.properties.outcomeVariableId.$ref).toBe('#/functions/variable');
    }
  });

  test('each block calls its own hook of the battle systems with the troop', async () => {
    for (const [executor, hook] of [[start_battle, 'start'], [start_turn_battle, 'startTurnBased'], [start_tactical_battle, 'startTactical']] as const) {
      const { player, callHooks } = playerAnswering();
      await executor({ player } as any, { troopId: 'slimes' });
      expect(callHooks).toHaveBeenCalledWith(`server-studioBattle-${hook}`, player, 'slimes');
    }
  });

  test('writes 1 on victory, 2 on defeat and 3 on escape to the outcome variable', async () => {
    for (const [outcome, value] of [['victory', 1], ['defeat', 2], ['escape', 3]] as const) {
      const { player, variables } = playerAnswering({ outcome, exp: 10, gold: 5 });
      await start_turn_battle({ player } as any, { troopId: 'slimes', outcomeVariableId: 'v1' });
      expect(variables.get('v1')).toBe(value);
    }
  });

  test('counts a tactical battle the player left before its end as an escape', async () => {
    const { player, variables } = playerAnswering({ outcome: 'abandon', rounds: 2 });
    await start_tactical_battle({ player } as any, { troopId: 'slimes', outcomeVariableId: 'v1' });
    expect(variables.get('v1')).toBe(BATTLE_OUTCOME_VALUES.escape);
  });

  test('takes the outcome of the system that played the troop, the others answer nothing', async () => {
    const { player } = playerAnswering(undefined, { outcome: 'defeat' }, undefined);
    expect(await runBattleHook({ player }, 'start', 'slimes')).toBe('defeat');
  });

  test('writes through the context when it holds the variables, as the Set Variable block does', async () => {
    const { player, variables } = playerAnswering({ outcome: 'victory' });
    const setVariable = vi.fn();
    await start_battle({ player, setVariable } as any, { troopId: 'slimes', outcomeVariableId: 'v1' });
    expect(setVariable).toHaveBeenCalledWith('v1', 1);
    expect(variables.has('v1')).toBe(false);
  });

  test('changes no variable without outcomeVariableId, or when no system tells how the battle ended', async () => {
    const without = playerAnswering({ outcome: 'victory' });
    await start_battle({ player: without.player } as any, { troopId: 'slimes' });
    expect(without.variables.size).toBe(0);

    const silent = playerAnswering(undefined, undefined);
    await start_battle({ player: silent.player } as any, { troopId: 'slimes', outcomeVariableId: 'v1' });
    expect(silent.variables.size).toBe(0);
  });

  test('does nothing without a troop', async () => {
    const { player, callHooks } = playerAnswering({ outcome: 'victory' });
    await start_battle({ player } as any, { troopId: '', outcomeVariableId: 'v1' });
    expect(callHooks).not.toHaveBeenCalled();
  });

  test('fails when the battle system fails, as before', async () => {
    const error = new Error('battle crashed');
    const player = { hooks: { callHooks: () => observable((subscriber) => subscriber.error(error)) } };
    await expect(start_battle({ player } as any, { troopId: 'slimes', outcomeVariableId: 'v1' })).rejects.toBe(error);
  });
});

describe('battle blocks with the hooks of a real game', () => {
  let fixture: TestingFixture | undefined;
  afterEach(async () => {
    await fixture?.clear();
    fixture = undefined;
  });

  test('read the outcome a battle module returns, while another module that does not play the troop returns nothing', async () => {
    const played: string[] = [];
    const turnBased = defineModule<RpgServer>({
      maps: [{ id: 'battle-map', file: '' }],
      player: {
        async onConnected(player: RpgPlayer) {
          await player.changeMap('battle-map', { x: 100, y: 100 });
        },
      },
      studioBattle: {
        async start(_player: RpgPlayer, troop: string) {
          played.push(troop);
          return { outcome: 'victory', exp: 10, gold: 5 };
        },
      },
    } as RpgServer);
    // A second battle system that does not play this troop
    const tactical = defineModule<RpgServer>({
      studioBattle: {
        async start() {
          return undefined;
        },
      },
    } as RpgServer);
    fixture = await testing(createModule('BattleBlocks', [{ server: turnBased }, { server: tactical }]));
    const client = await fixture.createClient();
    const player = await client.waitForMapChange('battle-map');

    await start_battle({ player } as any, { troopId: 'boss', outcomeVariableId: 'boss_result' });

    expect(played).toEqual(['boss']);
    expect(player.getVariable('boss_result')).toBe(1);
  });
});
