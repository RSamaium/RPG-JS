import { bench, describe } from 'vitest';
import { sortByCollationKey } from './collision-order';

/**
 * Cost of ordering the collisions of a step. `legacy` is what the world did before: the pair key built
 * again for each comparison, compared with `localeCompare`.
 *
 * Run with `pnpm --filter @rpgjs/physic exec vitest bench src/world/collision-order.bench.ts`.
 */
let seed = 5;
const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const id = () => Array.from({ length: 8 }, () => ALPHABET[Math.floor(random() * ALPHABET.length)]).join('');

interface Pair {
  a: { uuid: string };
  b: { uuid: string };
}

const pairKey = (pair: Pair): string => (pair.a.uuid < pair.b.uuid ? `${pair.a.uuid}-${pair.b.uuid}` : `${pair.b.uuid}-${pair.a.uuid}`);

for (const count of [30, 100, 300]) {
  const players = Array.from({ length: 60 }, () => ({ uuid: id() }));
  const pairs: Pair[] = Array.from({ length: count }, () => ({
    a: players[Math.floor(random() * players.length)]!,
    b: players[Math.floor(random() * players.length)]!,
  }));

  describe(`${count} collisions`, () => {
    bench('legacy', () => {
      pairs.slice().sort((x, y) => pairKey(x).localeCompare(pairKey(y)));
    });
    bench('sortByCollationKey', () => {
      sortByCollationKey(pairs.slice(), pairKey);
    });
  });
}
