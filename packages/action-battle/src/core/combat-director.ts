import type { ActionBattleCombatDirectorOptions } from "../types";

type DirectorEntity = {
  id: string;
  getCurrentMap?: () => object | null | undefined;
};

type AttackSlot = {
  attackerId: string;
  expiresAt: number;
};

type DirectorState = Map<string, Map<string, AttackSlot>>;

const directors = new WeakMap<object, DirectorState>();

const normalize = (options: ActionBattleCombatDirectorOptions = {}) => ({
  enabled: options.enabled !== false,
  maxConcurrentAttackers: Math.max(
    1,
    Math.floor(options.maxConcurrentAttackers ?? 1)
  ),
  slotDurationMs: Math.max(100, options.slotDurationMs ?? 1200),
});

const prune = (slots: Map<string, AttackSlot>, now: number) => {
  for (const [attackerId, slot] of slots) {
    if (slot.expiresAt <= now) slots.delete(attackerId);
  }
};

export const acquireActionBattleAttackSlot = (
  attacker: DirectorEntity,
  target: DirectorEntity,
  options: ActionBattleCombatDirectorOptions = {},
  now = Date.now()
) => {
  const config = normalize(options);
  if (!config.enabled) return true;
  const map = attacker.getCurrentMap?.();
  if (!map) return true;
  let director = directors.get(map);
  if (!director) {
    director = new Map();
    directors.set(map, director);
  }
  let slots = director.get(target.id);
  if (!slots) {
    slots = new Map();
    director.set(target.id, slots);
  }
  prune(slots, now);
  const current = slots.get(attacker.id);
  if (current) {
    current.expiresAt = now + config.slotDurationMs;
    return true;
  }
  if (slots.size >= config.maxConcurrentAttackers) return false;
  slots.set(attacker.id, {
    attackerId: attacker.id,
    expiresAt: now + config.slotDurationMs,
  });
  return true;
};

export const releaseActionBattleAttackSlot = (
  attacker: DirectorEntity,
  target?: DirectorEntity | null
) => {
  const map = attacker.getCurrentMap?.();
  if (!map) return;
  const director = directors.get(map);
  if (!director) return;
  if (target) {
    director.get(target.id)?.delete(attacker.id);
    return;
  }
  for (const slots of director.values()) {
    slots.delete(attacker.id);
  }
};
