/**
 * Deterministic order of collisions.
 *
 * The world resolves collisions in the order of their pair key (the two entity ids, smallest first,
 * joined by `-`), compared with `String.prototype.localeCompare`. Comparing like that is expensive
 * (a collation per comparison, and the key rebuilt for each one), and it ran on every resolver pass
 * of every tick: with a crowd it was close to half of the CPU time of a server.
 *
 * The order must not change: it is part of the simulation, so that a client and a server that
 * resolve the same collisions reach the same positions. What changes is how it is computed:
 * - each key is built once per sort;
 * - keys made of ASCII letters, digits and `-` (the ids of RPGJS) are compared with plain string
 *   comparisons, which gives the order of the collation of the root locale: first the letters
 *   without their case, then the case, lowercase before uppercase;
 * - any other key goes through a shared `Intl.Collator`, which is the `localeCompare` order.
 *
 * The plain comparison is only used after checking, once, that it gives the same order as the
 * collation of the runtime (some locales order `ch`, `ll`, `aa`… in their own way).
 */
const collator = new Intl.Collator();

const FAST_KEY = /^[0-9A-Za-z-]*$/;

interface Keyed<T> {
  readonly item: T;
  readonly key: string;
  /** Lowercase key: what orders the letters, digits and `-`. */
  readonly folded: string;
  /** One digit per character, `1` for an uppercase letter: what orders keys equal but for their case. Made when needed. */
  mask: string | undefined;
}

const caseMask = (key: string): string => {
  let mask = "";
  for (let index = 0; index < key.length; index += 1) {
    const code = key.charCodeAt(index);
    mask += code >= 65 && code <= 90 ? "1" : "0";
  }
  return mask;
};

const compareFast = <T>(a: Keyed<T>, b: Keyed<T>): number => {
  if (a.folded < b.folded) return -1;
  if (a.folded > b.folded) return 1;
  a.mask ??= caseMask(a.key);
  b.mask ??= caseMask(b.key);
  return a.mask < b.mask ? -1 : a.mask > b.mask ? 1 : 0;
};

const keyed = <T>(item: T, key: string): Keyed<T> => ({ item, key, folded: key.toLowerCase(), mask: undefined });

/** Sorts with the fast comparison the keys given, without touching `items`. */
const sortKeysFast = (keys: readonly string[]): string[] =>
  keys.map((key) => keyed(key, key)).sort(compareFast).map((entry) => entry.key);

let fastOrderIsSafe: boolean | undefined;

/**
 * Whether the plain comparison gives the order of the collation of this runtime, for every pair of
 * short keys. Checked once: all the keys of two characters, and those of three characters on the
 * letters that make digraphs in some languages.
 */
export function fastOrderMatchesCollation(): boolean {
  if (fastOrderIsSafe !== undefined) return fastOrderIsSafe;
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-";
  const digraphs = "aAbBcChHlLsSzZ019-";
  const probe: string[] = [];
  for (const first of alphabet) for (const second of alphabet) probe.push(first + second);
  for (const first of digraphs) for (const second of digraphs) for (const third of digraphs) probe.push(first + second + third);
  const expected = [...probe].sort(collator.compare);
  const actual = sortKeysFast(probe);
  fastOrderIsSafe = expected.every((key, index) => key === actual[index]);
  return fastOrderIsSafe;
}

/**
 * Sorts `items` in place by the `localeCompare` order of their key. Items with the same key keep
 * their order (the sort is stable).
 *
 * @param items - Items to sort.
 * @param keyOf - Key of an item. Called once per item.
 */
export function sortByCollationKey<T>(items: T[], keyOf: (item: T) => string): void {
  sortEntries(items, keyOf, 'auto');
}

/**
 * Same as `sortByCollationKey`, but always with the plain comparison, whatever the keys are and
 * whatever the collation of the runtime says. Only for tests: it shows what the comparison alone
 * gives, without the checks that would hide a mistake in it.
 */
export function sortByPlainKey<T>(items: T[], keyOf: (item: T) => string): void {
  sortEntries(items, keyOf, 'plain');
}

function sortEntries<T>(items: T[], keyOf: (item: T) => string, mode: 'auto' | 'plain'): void {
  if (items.length < 2) return;
  const entries = items.map((item) => keyed(item, keyOf(item)));
  const fast = mode === 'plain' || (entries.every((entry) => FAST_KEY.test(entry.key)) && fastOrderMatchesCollation());
  entries.sort(fast ? compareFast : (a, b) => collator.compare(a.key, b.key));
  for (let index = 0; index < entries.length; index += 1) items[index] = entries[index]!.item;
}
