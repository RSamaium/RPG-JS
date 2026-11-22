import type { BattleView, Combatant, CommandType } from "./types";

/** Default timeline weights: lighter actions come back sooner. */
export const DEFAULT_WEIGHTS: Record<CommandType, number> = {
  attack: 1,
  skill: 1.2,
  item: 0.8,
  limit: 1.4,
  guard: 0.6,
  escape: 1,
  custom: 1,
};

/** Base delay between two turns of a combatant (lower = faster). */
export function turnDelay(c: Pick<Combatant, "stats">): number {
  return 1000 / (Math.max(1, c.stats.agi) + 20);
}

export const alive = (c: Combatant) => c.hp > 0;

/** Next combatant to act: smallest nextAt, allies first on ties, then slot order. */
export function nextActor(combatants: readonly Combatant[]): Combatant | null {
  let best: Combatant | null = null;
  for (const c of combatants) {
    if (!alive(c)) continue;
    if (
      !best ||
      c.nextAt < best.nextAt - 1e-9 ||
      (Math.abs(c.nextAt - best.nextAt) <= 1e-9 &&
        (c.side === "ally" ? 0 : 1) * 100 + c.slot <
          (best.side === "ally" ? 0 : 1) * 100 + best.slot)
    )
      best = c;
  }
  return best;
}

/**
 * Upcoming turn order (the timeline bar). When `pending` is given, the acting
 * combatant is assumed to use an action of that weight first: the bar can show
 * what an action would change before it is confirmed.
 */
export function previewTimeline(
  state: Pick<BattleView, "combatants" | "actor">,
  count = 10,
  pending?: { weight: number },
): string[] {
  const sim = state.combatants
    .filter(alive)
    .map((c) => ({ ...c, nextAt: c.nextAt }));
  const order: string[] = [];
  const actor = sim.find((c) => c.id === state.actor);
  if (actor) {
    order.push(actor.id);
    actor.nextAt += turnDelay(actor) * (pending?.weight ?? 1);
  }
  while (order.length < count && sim.length) {
    const c = nextActor(sim)!;
    order.push(c.id);
    c.nextAt += turnDelay(c);
  }
  return order;
}
