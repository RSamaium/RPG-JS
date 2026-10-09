import { describe, expect, test, vi } from 'vitest';
import {
  parseStringTemplate,
  resolveStringTemplate,
} from '../runtime/blocks/resolve-text';

describe('Studio string templates', () => {
  test('parses paths, optional labels, and source offsets', () => {
    const text = 'HP {{ variable:player.hp | label:Health points }} / {{variable:player.level}}';

    expect(parseStringTemplate(text)).toEqual([
      {
        type: 'variable',
        raw: '{{ variable:player.hp | label:Health points }}',
        path: 'player.hp',
        label: 'Health points',
        start: 3,
        end: 49,
      },
      {
        type: 'variable',
        raw: '{{variable:player.level}}',
        path: 'player.level',
        label: undefined,
        start: 52,
        end: 77,
      },
    ]);
  });

  test('resolves nested player properties and stored variable values', () => {
    const getVariable = vi.fn((id: string) => id === 'customer'
      ? { firstName: 'Ada', active: false, visits: 0, note: '' }
      : undefined);
    const context = {
      player: { hp: 42, profile: { title: 'Mage' } },
      getVariable,
    };

    expect(resolveStringTemplate([
      '{{ variable:player.hp | label:HP }}',
      '{{ variable:player.profile.title }}',
      '{{ variable:variable.customer.firstName | label:Customer }}',
      '{{ variable:variable.customer.active }}',
      '{{ variable:variable.customer.visits }}',
      '{{ variable:variable.customer.note }}',
    ].join('|'), context)).toBe('42|Mage|Ada|false|0|');
    expect(getVariable).toHaveBeenCalledWith('customer');
  });

  test('falls back to the player variable API', () => {
    const getVariable = vi.fn(() => 'Alex');
    expect(resolveStringTemplate('{{ variable:variable.name }}', {
      player: { getVariable },
    })).toBe('Alex');
  });

  test('keeps unresolved, object, function, and unsafe paths unchanged', () => {
    const context = {
      player: {
        missing: null,
        profile: { name: 'Ada' },
        action: () => 'unsafe',
      },
      getVariable: () => undefined,
    };
    const tokens = [
      '{{ variable:player.unknown }}',
      '{{ variable:player.missing }}',
      '{{ variable:player.profile }}',
      '{{ variable:player.action }}',
      '{{ variable:player.__proto__.name }}',
      '{{ variable:event.name }}',
    ];

    expect(resolveStringTemplate(tokens.join('|'), context)).toBe(tokens.join('|'));
  });

  test('keeps legacy hp and level placeholders compatible', () => {
    expect(resolveStringTemplate('HP {hp}, level {level}, {name}', {
      player: { hp: 12, level: 3, name: 'Ada' },
    })).toBe('HP 12, level 3, {name}');
  });
});
