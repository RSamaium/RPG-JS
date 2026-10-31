const stacks = new WeakMap<object, { at: number; count: number }>();

/**
 * Vertical offset of a collect text, so the texts of pickups collected
 * together stack instead of overlapping.
 */
export const nextLootTextOffset = (owner: object, now: number = Date.now()): number => {
  const stack = stacks.get(owner) ?? { at: 0, count: 0 };
  stack.count = now - stack.at < 400 ? stack.count + 1 : 0;
  stack.at = now;
  stacks.set(owner, stack);
  return -stack.count * 14;
};
