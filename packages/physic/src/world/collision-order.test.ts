import { describe, expect, it } from 'vitest';
import { fastOrderMatchesCollation, sortByCollationKey, sortByPlainKey } from './collision-order';
import { World } from './World';

let seed = 1;
const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const pick = (alphabet: string) => alphabet[Math.floor(random() * alphabet.length)]!;
const text = (alphabet: string, length: number) => Array.from({ length }, () => pick(alphabet)).join('');

const ALNUM = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const FAST = `${ALNUM}-`;

/** What the world did before: `localeCompare` on the keys. */
const legacySort = (keys: string[]): string[] => [...keys].sort((a, b) => a.localeCompare(b));
const sortWith = (sort: typeof sortByCollationKey, keys: string[]): string[] => {
  const items = keys.map((key, index) => ({ key, index }));
  sort(items, (item) => item.key);
  return items.map((item) => item.key);
};
const newSort = (keys: string[]): string[] => sortWith(sortByCollationKey, keys);
/** The plain comparison alone, without the checks of the runtime. */
const plainSort = (keys: string[]): string[] => sortWith(sortByPlainKey, keys);

/**
 * The plain comparison alone gives the order of the root collation. A runtime whose default locale orders
 * ASCII differently (Czech, Welsh…) does not use it, and the tests of it make no sense there.
 */
const expectPlainOrder = (keys: string[]): void => {
  if (fastOrderMatchesCollation()) expect(plainSort(keys)).toEqual(legacySort(keys));
};

describe('collision order', () => {
  it('takes the fast path in English, and never when the plain comparison would give another order', () => {
    const pairs: string[] = [];
    for (const a of FAST) for (const b of FAST) pairs.push(a + b);
    const plainAgrees = plainSort(pairs).every((key, index) => key === legacySort(pairs)[index]);
    if (new Intl.Collator().resolvedOptions().locale.startsWith('en')) expect(fastOrderMatchesCollation()).toBe(true);
    // If the plain comparison already differs on two characters, the check must refuse it.
    if (!plainAgrees) expect(fastOrderMatchesCollation()).toBe(false);
  });

  it('keeps the order of localeCompare for the ids of RPGJS: eight mixed-case characters', () => {
    seed = 11;
    for (let round = 0; round < 300; round += 1) {
      const keys = Array.from({ length: 60 }, () => `${text(ALNUM, 8)}-${text(ALNUM, 8)}`);
      expect(newSort(keys)).toEqual(legacySort(keys));
      expectPlainOrder(keys);
    }
  });

  it('keeps the order of localeCompare for keys that differ only by case, digits, `-` or length', () => {
    seed = 12;
    for (let round = 0; round < 300; round += 1) {
      // Few distinct letters, so that prefixes, case-only differences and ties are everywhere.
      const keys = Array.from({ length: 80 }, () => text('aAbB01-', 1 + Math.floor(random() * 6)));
      expect(newSort(keys)).toEqual(legacySort(keys));
      expectPlainOrder(keys);
    }
  });

  it('keeps the order of localeCompare for UUID-like ids', () => {
    seed = 13;
    const hex = '0123456789abcdefABCDEF';
    const uuid = () => `${text(hex, 8)}-${text(hex, 4)}-${text(hex, 4)}-${text(hex, 4)}-${text(hex, 12)}`;
    const keys = Array.from({ length: 400 }, () => `${uuid()}-${uuid()}`);
    expect(newSort(keys)).toEqual(legacySort(keys));
    expectPlainOrder(keys);
  });

  it('compares every pair of two characters like localeCompare', () => {
    const keys: string[] = [];
    for (const a of FAST) for (const b of FAST) keys.push(a + b);
    expect(newSort(keys)).toEqual(legacySort(keys));
    expectPlainOrder(keys);
  });

  it('keeps keys with the same text in their original order (stable)', () => {
    const items = [
      { key: 'b-c', id: 1 },
      { key: 'a-c', id: 2 },
      { key: 'b-c', id: 3 },
      { key: 'a-c', id: 4 },
      { key: 'b-c', id: 5 },
    ];
    sortByCollationKey(items, (item) => item.key);
    expect(items.map((item) => item.id)).toEqual([2, 4, 1, 3, 5]);
  });

  it('falls back to the collation for keys the plain comparison does not cover', () => {
    seed = 14;
    const alphabet = `${ALNUM}-_.:éÉñßçøÅ 😀`;
    for (let round = 0; round < 200; round += 1) {
      const keys = Array.from({ length: 50 }, () => text(alphabet, 1 + Math.floor(random() * 8)));
      expect(newSort(keys)).toEqual(legacySort(keys));
    }
  });

  it('falls back for a whole sort as soon as one key is not covered', () => {
    const keys = ['b-b', 'a_a', 'A-a', 'a-A', 'a-a'];
    expect(newSort(keys)).toEqual(legacySort(keys));
  });

  it('calls keyOf once per item', () => {
    const items = Array.from({ length: 50 }, (_, index) => ({ key: text(FAST, 8), index }));
    let calls = 0;
    sortByCollationKey(items, (item) => {
      calls += 1;
      return item.key;
    });
    expect(calls).toBe(items.length);
  });

  it('handles empty and single lists', () => {
    const none: string[] = [];
    sortByCollationKey(none, (key) => key);
    expect(none).toEqual([]);
    const one = ['x'];
    sortByCollationKey(one, (key) => key);
    expect(one).toEqual(['x']);
  });
});

describe('World: resolution order', () => {
  const ids = (count: number) => {
    seed = 21;
    return Array.from({ length: count }, () => text(ALNUM, 8));
  };

  const simulate = (legacy: boolean) => {
    seed = 22;
    const world = new World({ timeStep: 1 / 60 });
    if (legacy) {
      (world as unknown as { sortCollisionsForDeterminism: (c: Array<{ entityA: { uuid: string }; entityB: { uuid: string } }>) => void }).sortCollisionsForDeterminism = (collisions) => {
        const key = (c: { entityA: { uuid: string }; entityB: { uuid: string } }) => (c.entityA.uuid < c.entityB.uuid ? `${c.entityA.uuid}-${c.entityB.uuid}` : `${c.entityB.uuid}-${c.entityA.uuid}`);
        collisions.sort((a, b) => key(a).localeCompare(key(b)));
      };
    }
    const entities = ids(40).map((uuid) =>
      world.createEntity({
        uuid,
        position: { x: random() * 80, y: random() * 80 },
        radius: 12,
        mass: 1,
        velocity: { x: (random() - 0.5) * 80, y: (random() - 0.5) * 80 },
      }),
    );
    for (let step = 0; step < 240; step += 1) world.step();
    return entities.map((entity) => [entity.uuid, entity.position.x, entity.position.y]);
  };

  it('simulates exactly what the localeCompare order simulated, position for position', () => {
    expect(simulate(false)).toEqual(simulate(true));
  });
});
