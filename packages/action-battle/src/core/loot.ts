/**
 * Pure loot rules shared by the server spawner and the client renderer.
 *
 * The server owns every decision (what drops, where it lands, who collects it).
 * The client only receives the serializable `ActionBattleLootVisual` props and
 * animates the pop, the idle bob and the flight to the collector.
 */

/** Sprite component id that renders a loot pickup on the client. */
export const ACTION_BATTLE_LOOT_COMPONENT_ID = "action-battle-loot";

/**
 * World loot settings, used by `rewards.drop` on an enemy or by
 * `dropActionBattleLoot()`.
 *
 * @example
 * ```ts
 * rewards: {
 *   gold: 20,
 *   items: [{ itemId: "potion", chance: 30 }],
 *   drop: { ownership: "attacker", magnetRadius: 96 }
 * }
 * ```
 */
export interface ActionBattleLootOptions {
  /**
   * Who sees and collects the loot.
   *
   * - `shared` (default): every player on the map sees it, the first one in
   *   range collects it.
   * - `attacker`: only the player who defeated the enemy sees and collects it
   *   (instanced MMORPG loot). Falls back to `shared` without a player owner.
   */
  ownership?: "shared" | "attacker";
  /**
   * Number of coin pickups the gold is split into. Defaults to one coin per
   * 5 gold, between 1 and 6.
   */
  goldPiles?: number;
  /** Landing distance from the enemy, in pixels, as `[min, max]`. */
  spread?: [number, number];
  /** Extra delay after landing before a pickup can be collected. */
  pickupDelayMs?: number;
  /** Distance at which a pickup flies to the player and is collected. */
  magnetRadius?: number;
  /** Lifetime of an uncollected pickup. `0` keeps it forever. */
  despawnMs?: number;
  /** Duration of the arc between the enemy and the landing point. */
  flightMs?: number;
  /** Peak height of the arc, in pixels. */
  height?: number;
  /** Sound played to the collector, if the sound id is registered. */
  pickupSound?: string;
}

export type NormalizedActionBattleLootOptions = Required<
  Omit<ActionBattleLootOptions, "goldPiles" | "pickupSound">
> &
  Pick<ActionBattleLootOptions, "goldPiles" | "pickupSound">;

export const DEFAULT_ACTION_BATTLE_LOOT_OPTIONS: NormalizedActionBattleLootOptions = {
  ownership: "shared",
  spread: [22, 58],
  pickupDelayMs: 250,
  magnetRadius: 64,
  despawnMs: 30000,
  flightMs: 560,
  height: 42,
};

/** One pickup that will be spawned in the world. */
export type ActionBattleLootDrop =
  | { kind: "gold"; amount: number }
  | { kind: "item"; item: unknown; itemId?: string; amount: number };

/** Serializable props sent to the client loot component. */
export interface ActionBattleLootVisual {
  kind: "gold" | "item";
  amount: number;
  /** Spritesheet id of the item icon, when the item has one. */
  icon?: string;
  /** Start of the arc, relative to the landing point. */
  fromX: number;
  fromY: number;
  height: number;
  flightMs: number;
  /** Stagger before this pickup leaves the enemy. */
  delayMs: number;
  /** Server timestamp of the spawn, so late joiners skip the arc. */
  spawnedAt: number;
}

export interface ActionBattleLootRewardItem {
  item?: unknown;
  itemId?: string;
  amount?: number;
  chance?: number;
}

export interface ActionBattleLootRewards {
  gold?: number;
  items?: Array<ActionBattleLootRewardItem | string>;
}

export const normalizeActionBattleLootOptions = (
  options: boolean | ActionBattleLootOptions | undefined
): NormalizedActionBattleLootOptions => {
  const custom = typeof options === "object" && options ? options : {};
  const merged = { ...DEFAULT_ACTION_BATTLE_LOOT_OPTIONS, ...custom };
  const [min, max] = merged.spread;
  return {
    ...merged,
    spread: [Math.max(0, Math.min(min, max)), Math.max(min, max)],
  };
};

/**
 * Split gold into coin piles whose sum is exactly `gold`.
 *
 * @example
 * splitActionBattleGold(23) // [5, 5, 5, 4, 4]
 */
export const splitActionBattleGold = (gold: number, piles?: number): number[] => {
  const total = Math.max(0, Math.floor(gold));
  if (total <= 0) return [];
  const requested = piles ?? Math.ceil(total / 5);
  const count = Math.max(1, Math.min(total, Math.min(6, Math.floor(requested))));
  const base = Math.floor(total / count);
  const rest = total % count;
  return Array.from({ length: count }, (_, index) => base + (index < rest ? 1 : 0));
};

/**
 * Roll the reward table into concrete pickups. Item chances are percentages,
 * like `rewards.items[].chance`.
 */
export const rollActionBattleLoot = (
  rewards: ActionBattleLootRewards,
  options: Pick<ActionBattleLootOptions, "goldPiles"> = {},
  random: () => number = Math.random
): ActionBattleLootDrop[] => {
  const drops: ActionBattleLootDrop[] = splitActionBattleGold(
    rewards.gold ?? 0,
    options.goldPiles
  ).map((amount) => ({ kind: "gold", amount }));

  for (const raw of rewards.items ?? []) {
    const entry = typeof raw === "string" ? { itemId: raw } : raw;
    const item = entry.item ?? entry.itemId;
    if (!item) continue;
    if (random() * 100 >= (entry.chance ?? 100)) continue;
    drops.push({
      kind: "item",
      item,
      itemId: entry.itemId ?? (typeof item === "string" ? item : (item as any)?.id),
      amount: entry.amount ?? 1,
    });
  }
  return drops;
};

/**
 * Spread landing points around the origin: even angles with jitter, so a
 * burst never stacks two pickups on the same spot.
 */
export const scatterActionBattleLoot = (
  origin: { x: number; y: number },
  count: number,
  spread: [number, number],
  random: () => number = Math.random
): Array<{ x: number; y: number }> => {
  if (count <= 0) return [];
  const start = random() * Math.PI * 2;
  const step = (Math.PI * 2) / count;
  return Array.from({ length: count }, (_, index) => {
    const angle = start + step * index + (random() - 0.5) * step * 0.6;
    const distance = spread[0] + (spread[1] - spread[0]) * random();
    return {
      x: origin.x + Math.cos(angle) * distance,
      y: origin.y + Math.sin(angle) * distance,
    };
  });
};

/**
 * Position of a pickup along its pop at `elapsedMs`, relative to the landing
 * point: a main arc then one small bounce. `z` is the height above ground.
 */
export const sampleActionBattleLootArc = (
  visual: Pick<ActionBattleLootVisual, "fromX" | "fromY" | "height" | "flightMs">,
  elapsedMs: number
): { x: number; y: number; z: number; done: boolean } => {
  const flight = Math.max(1, visual.flightMs);
  const main = flight * 0.78;
  if (elapsedMs <= 0) {
    return { x: visual.fromX, y: visual.fromY, z: 0, done: false };
  }
  if (elapsedMs < main) {
    const t = elapsedMs / main;
    const ease = 1 - (1 - t) * (1 - t);
    return {
      x: visual.fromX * (1 - ease),
      y: visual.fromY * (1 - ease),
      z: 4 * visual.height * t * (1 - t),
      done: false,
    };
  }
  if (elapsedMs < flight) {
    const t = (elapsedMs - main) / (flight - main);
    return { x: 0, y: 0, z: 4 * visual.height * 0.18 * t * (1 - t), done: false };
  }
  return { x: 0, y: 0, z: 0, done: true };
};
