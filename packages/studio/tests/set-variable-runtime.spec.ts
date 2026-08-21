import { describe, expect, test, vi } from 'vitest';
import { change_variable } from '../runtime/blocks/executors/change-variable';
import { schemaSetVariable, set_variable } from '../runtime/blocks/executors/set-variable';

const createContext = (overrides: Record<string, any> = {}) => {
  const variables = new Map<string, unknown>([
    ['score', 10],
    ['bonus', 5],
  ]);

  return {
    player: {
      id: 'player_1',
      name: 'Alex',
      direction: 'down',
      x: () => 12,
      y: () => 16,
      gold: 250,
      level: 7,
      hp: 42,
      sp: 9,
      getVariable: vi.fn((id: string) => variables.get(id)),
      setVariable: vi.fn((id: string, value: unknown) => variables.set(id, value)),
      ...overrides.player,
    },
    map: {
      id: 'map_1',
      ...overrides.map,
    },
    getVariable: vi.fn((id: string) => variables.get(id)),
    setVariable: vi.fn((id: string, value: unknown) => variables.set(id, value)),
    getStoredVariable: (id: string) => variables.get(id),
    ...overrides.context,
  } as any;
};

describe('set_variable runtime block', () => {
  test('exposes the free value field only for the constant value source', () => {
    expect(schemaSetVariable.schema.properties).not.toHaveProperty('value');
    expect(schemaSetVariable.schema.required).toEqual(['variableId', 'valueSource']);

    const constantBranch = schemaSetVariable.schema.allOf[0] as any;
    expect(constantBranch.if.properties.valueSource.const).toBe('constant');
    expect(constantBranch.then.properties.value.type).toBe('string');
    expect(constantBranch.then.required).toEqual(['value']);
    expect(constantBranch.else.if.properties.valueSource.const).toBe('variable');
    expect(constantBranch.else.then.properties.sourceVariableId.type).toBe('string');
    expect(constantBranch.else.else.if.properties.valueSource.const).toBe('random');
    expect(constantBranch.else.else.then.properties.randomInteger).toBeUndefined();
  });

  test('sets constants and keeps numeric operations numeric', async () => {
    const context = createContext();

    await set_variable(context, {
      variableId: 'score',
      operation: 'set',
      valueSource: 'constant',
      value: '3',
    });
    expect(context.getStoredVariable('score')).toBe(3);

    await set_variable(context, {
      variableId: 'score',
      operation: 'multiply',
      valueSource: 'constant',
      value: 4,
    });
    expect(context.getStoredVariable('score')).toBe(12);
  });

  test('reads another variable as the source value', async () => {
    const context = createContext();

    await set_variable(context, {
      variableId: 'score',
      operation: 'add',
      valueSource: 'variable',
      sourceVariableId: 'bonus',
    });

    expect(context.getVariable).toHaveBeenCalledWith('bonus');
    expect(context.getStoredVariable('score')).toBe(15);
  });

  test('sets an integer random value inside the configured interval', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const context = createContext();

    await set_variable(context, {
      variableId: 'score',
      operation: 'set',
      valueSource: 'random',
      randomMin: 2,
      randomMax: 6,
    });

    expect(context.getStoredVariable('score')).toBe(4);
    randomSpy.mockRestore();
  });

  test('sets player and map context values', async () => {
    const context = createContext();

    const cases = [
      ['player_x', 12],
      ['player_y', 16],
      ['player_direction', 'down'],
      ['map_id', 'map_1'],
      ['gold', 250],
      ['player_id', 'player_1'],
      ['player_name', 'Alex'],
      ['level', 7],
      ['hp', 42],
      ['sp', 9],
    ] as const;

    for (const [valueSource, expected] of cases) {
      await set_variable(context, {
        variableId: 'score',
        operation: 'set',
        valueSource,
      });
      expect(context.getStoredVariable('score')).toBe(expected);
    }
  });

  test('sets query-area hit values and uses neutral values outside a query', async () => {
    const context = createContext({
      context: {
        areaHit: {
          id: 'enemy-1',
          kind: 'events',
          distance: 24,
          distanceRatio: 0.25,
          falloffLinear: 0.75,
        },
      },
    });
    const cases = [
      ['area_target_id', 'enemy-1'],
      ['area_target_kind', 'events'],
      ['area_distance', 24],
      ['area_distance_ratio', 0.25],
      ['area_falloff_linear', 0.75],
    ] as const;

    for (const [valueSource, expected] of cases) {
      await set_variable(context, { variableId: 'score', operation: 'set', valueSource });
      expect(context.getStoredVariable('score')).toBe(expected);
    }

    const outsideContext = createContext();
    await set_variable(outsideContext, {
      variableId: 'score',
      operation: 'set',
      valueSource: 'area_target_id',
    });
    expect(outsideContext.getStoredVariable('score')).toBe('');
  });

  test('executes legacy change_variable payloads through set_variable behavior', async () => {
    const context = createContext();

    await change_variable(context, {
      variableId: 'score',
      type: 'variable',
      operation: 'mul',
      amountVariableId: 'bonus',
    });

    expect(context.getStoredVariable('score')).toBe(50);
  });
});
