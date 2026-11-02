/**
 * Pure loot rules shared by the server spawner and the client renderer.
 *
 * The server owns every decision (what drops, where it lands, who collects it).
 * The client only receives the serializable `LootVisual` props and animates the
 * pop, the idle bob and the flight to the collector.
 */

/** Sprite component id that renders a loot pickup on the client. */
export const LOOT_COMPONENT_ID = "rpg:loot";

/** Component animation id of the floating text shown on the collector. */
export const LOOT_TEXT_ANIMATION_ID = "rpg:loot-text";

/** How a pickup is collected. */
export type LootPickupMode = "magnet" | "touch" | "action";

/** Rarity tier: drives the glow strength and the lifetime of a pickup. */
export type LootRarity = "common" | "rare" | "epic";

/**
 * Loot presentation and behavior declared on an item of the database.
 *
 * @example
 * ```ts
 * const Wood = {
 *   id: "wood",
 *   name: "Wood",
 *   icon: "wood",
 *   loot: { color: "#c98a1c", sound: "wood-pickup" },
 * };
 * ```
 */
export interface ItemLootConfig {
  /** Client component registered with the `loot.components` client hook. */
  visual?: string;
  /** Glow color, for example `"#8be9fd"`. */
  color?: string;
  /** Sound played to the collector. */
  sound?: string;
  /** Rarity tier. `rare` and `epic` glow stronger and stay twice as long. */
  rarity?: LootRarity;
  /** Use the item as soon as it is collected instead of keeping it. */
  use?: boolean;
}

/** Magnet settings of the `magnet` pickup mode. */
export interface LootMagnetOptions<TPlayer = unknown> {
  /** Distance at which a pickup flies to the player. Can depend on the player. */
  radius?: number | ((player: TPlayer) => number);
  /** Extra delay after landing before a pickup can be collected. */
  delayMs?: number;
}

/**
 * World loot settings, used by `event.dropLoot()`, `map.dropLoot()` and the
 * `rewards.drop` option of Action Battle enemies.
 */
export interface LootOptions<TPlayer = unknown> {
  /**
   * How a pickup is collected.
   *
   * - `magnet` (default): it flies to the first player in the magnet radius.
   * - `touch`: the player walks on it.
   * - `action`: the player presses the action key next to it.
   */
  pickup?: LootPickupMode;
  /** Magnet radius and delay. Only used by the `magnet` mode. */
  magnet?: LootMagnetOptions<TPlayer>;
  /**
   * Who sees and collects the loot.
   *
   * - `shared` (default): every player on the map.
   * - `player`: only the owner player (`attacker` is an alias).
   */
  ownership?: "shared" | "player" | "attacker";
  /** Number of coin pickups the gold is split into (1 per 5 gold, 6 at most). */
  goldPiles?: number;
  /** Spawn one pickup per unit instead of one pickup with a quantity badge. */
  splitItems?: boolean;
  /** Landing distance from the origin, in pixels, as `[min, max]`. */
  spread?: [number, number];
  /** Lifetime of an uncollected pickup. `0` keeps it forever. */
  despawnMs?: number;
  /** Duration of the arc between the origin and the landing point. */
  flightMs?: number;
  /** Peak height of the arc, in pixels. */
  height?: number;
  /** Sound played to the collector when the item has none. */
  pickupSound?: string;
  /** Overrides the item `loot` config for every pickup of this drop. */
  item?: ItemLootConfig;
}

export interface NormalizedLootOptions {
  pickup: LootPickupMode;
  magnetDelayMs: number;
  ownership: "shared" | "player";
  goldPiles?: number;
  splitItems: boolean;
  spread: [number, number];
  despawnMs: number;
  flightMs: number;
  height: number;
  pickupSound?: string;
}

export const DEFAULT_LOOT_MAGNET_RADIUS = 64;
/** Collect distance of the `touch` mode, between the two centers. */
export const LOOT_TOUCH_RADIUS = 22;

export const normalizeLootOptions = (
  options: boolean | LootOptions<any> | undefined
): NormalizedLootOptions => {
  const custom = typeof options === "object" && options ? options : {};
  const [min, max] = custom.spread ?? [22, 58];
  return {
    pickup: custom.pickup ?? "magnet",
    magnetDelayMs: custom.magnet?.delayMs ?? 250,
    ownership: custom.ownership === "player" || custom.ownership === "attacker" ? "player" : "shared",
    goldPiles: custom.goldPiles,
    splitItems: custom.splitItems === true,
    spread: [Math.max(0, Math.min(min, max)), Math.max(min, max)],
    despawnMs: custom.despawnMs ?? 30000,
    flightMs: custom.flightMs ?? 560,
    height: custom.height ?? 42,
    pickupSound: custom.pickupSound,
  };
};

/** One pickup that will be spawned in the world. */
export type LootDrop =
  | { kind: "gold"; amount: number }
  | { kind: "item"; item: unknown; itemId?: string; amount: number };

export interface LootRewardItem {
  item?: unknown;
  itemId?: string;
  amount?: number;
  /** Drop chance in percent. Defaults to 100. */
  chance?: number;
}

/** Reward table rolled into pickups. Same shape as enemy rewards. */
export interface LootRewards {
  gold?: number;
  items?: Array<LootRewardItem | string>;
  /** Show the inventory notification when an item is collected. */
  showNotification?: boolean;
}

/** Serializable props sent to the client loot component. */
export interface LootVisual {
  kind: "gold" | "item";
  amount: number;
  /** Spritesheet id of the item icon, when the item has one. */
  icon?: string;
  /** Item name, shown by the collect text. */
  name?: string;
  /** Custom client component id. */
  visual?: string;
  color?: string;
  rarity?: LootRarity;
  /** Sound played by the collector. */
  sound?: string;
  /** Start of the arc, relative to the landing point. */
  fromX: number;
  fromY: number;
  height: number;
  flightMs: number;
  /** Stagger before this pickup leaves the origin. */
  delayMs: number;
  /** Server timestamp of the spawn, so late joiners skip the arc. */
  spawnedAt: number;
}

/**
 * Split gold into coin piles whose sum is exactly `gold`.
 *
 * @example
 * splitLootGold(23) // [5, 5, 5, 4, 4]
 */
export const splitLootGold = (gold: number, piles?: number): number[] => {
  const total = Math.max(0, Math.floor(gold));
  if (total <= 0) return [];
  const requested = piles ?? Math.ceil(total / 5);
  const count = Math.max(1, Math.min(total, Math.min(6, Math.floor(requested))));
  const base = Math.floor(total / count);
  const rest = total % count;
  return Array.from({ length: count }, (_, index) => base + (index < rest ? 1 : 0));
};

/**
 * Roll the reward table into concrete pickups. Item chances are percentages.
 */
export const rollLoot = (
  rewards: LootRewards,
  options: Pick<LootOptions, "goldPiles" | "splitItems"> = {},
  random: () => number = Math.random
): LootDrop[] => {
  const drops: LootDrop[] = splitLootGold(rewards.gold ?? 0, options.goldPiles).map(
    (amount) => ({ kind: "gold", amount })
  );

  for (const raw of rewards.items ?? []) {
    const entry = typeof raw === "string" ? { itemId: raw } : raw;
    const item = entry.item ?? entry.itemId;
    if (!item) continue;
    if (random() * 100 >= (entry.chance ?? 100)) continue;
    const itemId = entry.itemId ?? (typeof item === "string" ? item : (item as any)?.id);
    const amount = Math.max(1, Math.floor(entry.amount ?? 1));
    const units = options.splitItems ? Array.from({ length: amount }, () => 1) : [amount];
    for (const unit of units) drops.push({ kind: "item", item, itemId, amount: unit });
  }
  return drops;
};

/**
 * Spread landing points around the origin: even angles with jitter, so a
 * burst never stacks two pickups on the same spot.
 */
export const scatterLoot = (
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
export const sampleLootArc = (
  visual: Pick<LootVisual, "fromX" | "fromY" | "height" | "flightMs">,
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

/**
 * Merge the loot configs by precedence: drop option, then item config.
 */
export const resolveItemLootConfig = (
  itemConfig: ItemLootConfig | undefined,
  dropConfig: ItemLootConfig | undefined
): ItemLootConfig => ({ ...(itemConfig ?? {}), ...(dropConfig ?? {}) });
