import { Components, EventMode, type RpgEvent, type RpgPlayer } from "@rpgjs/server";
import {
  ACTION_BATTLE_LOOT_COMPONENT_ID,
  normalizeActionBattleLootOptions,
  rollActionBattleLoot,
  scatterActionBattleLoot,
  type ActionBattleLootDrop,
  type ActionBattleLootOptions,
  type ActionBattleLootRewards,
  type ActionBattleLootVisual,
  type NormalizedActionBattleLootOptions,
} from "./core/loot";

/** Hitbox of a pickup. Small, so pickups never block movement or attacks. */
const LOOT_SIZE = 16;
const LOOT_TICK_MS = 50;
/** Time the client keeps a collected pickup to fly it to the collector. */
const LOOT_COLLECT_MS = 260;
const LOOT_EXPIRE_MS = 400;

type LootMap = NonNullable<ReturnType<RpgPlayer["getCurrentMap"]>>;

export interface ActionBattleLootCollectContext {
  player: RpgPlayer;
  drop: ActionBattleLootDrop;
  event: RpgEvent;
}

export interface DropActionBattleLootOptions extends ActionBattleLootOptions {
  /** World position the pickups pop from (usually the enemy center). */
  x: number;
  y: number;
  /** Reward table rolled into pickups: gold piles and item chances. */
  rewards: ActionBattleLootRewards & { showNotification?: boolean };
  /** Player that owns the loot when `ownership` is `attacker`. */
  owner?: RpgPlayer | null;
  /** Called on the server right after a player collected a pickup. */
  onCollect?: (context: ActionBattleLootCollectContext) => void;
}

interface LootEntry {
  event: RpgEvent;
  drop: ActionBattleLootDrop;
  ownerId?: string;
  readyAt: number;
  expiresAt: number;
  options: NormalizedActionBattleLootOptions;
  notify: boolean;
  onCollect?: DropActionBattleLootOptions["onCollect"];
  done: boolean;
}

interface LootRegistry {
  entries: Set<LootEntry>;
  timer?: ReturnType<typeof setInterval>;
}

const registries = new WeakMap<object, LootRegistry>();
let lootSequence = 0;

const centerOf = (entity: any) => {
  const hitbox = entity.hitbox?.() ?? { w: 32, h: 32 };
  return { x: entity.x() + hitbox.w / 2, y: entity.y() + hitbox.h / 2 };
};

const clampToMap = (map: any, point: { x: number; y: number }) => {
  const width = Number(map.data?.()?.width);
  const height = Number(map.data?.()?.height);
  const half = LOOT_SIZE / 2;
  return {
    x: Number.isFinite(width) && width > 0 ? Math.min(Math.max(point.x, half), width - half) : point.x,
    y: Number.isFinite(height) && height > 0 ? Math.min(Math.max(point.y, half), height - half) : point.y,
  };
};

const resolveItemIcon = (map: any, drop: ActionBattleLootDrop): string | undefined => {
  if (drop.kind !== "item") return undefined;
  const data =
    typeof drop.item === "string" ? map.database?.()?.[drop.item] : (drop.item as any);
  const icon = typeof data?.icon === "function" ? data.icon() : data?.icon;
  return typeof icon === "string" ? icon : undefined;
};

const resolveItemName = (inventoryItem: any, drop: ActionBattleLootDrop & { kind: "item" }) => {
  const name = typeof inventoryItem?.name === "function" ? inventoryItem.name() : inventoryItem?.name;
  return name ?? (drop.item as any)?.name ?? drop.itemId ?? "item";
};

/** True for events spawned by `dropActionBattleLoot()`. */
export const isActionBattleLoot = (event: unknown): boolean =>
  !!(event as any)?.actionBattleLoot;

const grant = (entry: LootEntry, player: RpgPlayer) => {
  const { drop } = entry;
  if (drop.kind === "gold") {
    player.gold += drop.amount;
  } else {
    const inventoryItem = player.addItem(drop.item as any, drop.amount);
    if (entry.notify) {
      player.showNotification(
        player.t("rpg.notification.reward.item", {
          amount: drop.amount,
          name: resolveItemName(inventoryItem, drop),
        }),
        { icon: resolveItemIcon(player.getCurrentMap(), drop) }
      );
    }
  }
  if (entry.options.pickupSound) {
    player.playSound(entry.options.pickupSound);
  }
};

const collect = (registry: LootRegistry, entry: LootEntry, player: RpgPlayer) => {
  entry.done = true;
  registry.entries.delete(entry);
  grant(entry, player);
  entry.onCollect?.({ player, drop: entry.drop, event: entry.event });
  entry.event.remove({
    reason: "collected",
    data: { collectorId: player.id },
    timeoutMs: LOOT_COLLECT_MS,
  });
};

const expire = (registry: LootRegistry, entry: LootEntry) => {
  entry.done = true;
  registry.entries.delete(entry);
  entry.event.remove({ reason: "expired", timeoutMs: LOOT_EXPIRE_MS });
};

const stepRegistry = (map: LootMap, registry: LootRegistry) => {
  const now = Date.now();
  const players = map.getPlayers();
  for (const entry of [...registry.entries]) {
    if (entry.done) continue;
    if (!map.getEvent(entry.event.id)) {
      registry.entries.delete(entry);
      continue;
    }
    if (entry.options.despawnMs > 0 && now >= entry.expiresAt) {
      expire(registry, entry);
      continue;
    }
    if (now < entry.readyAt) continue;

    const loot = centerOf(entry.event);
    let nearest: RpgPlayer | undefined;
    let nearestDistance = entry.options.magnetRadius;
    for (const player of players) {
      if (entry.ownerId && player.id !== entry.ownerId) continue;
      if ((player as any).hp !== undefined && (player as any).hp <= 0) continue;
      const position = centerOf(player);
      const distance = Math.hypot(position.x - loot.x, position.y - loot.y);
      if (distance <= nearestDistance) {
        nearest = player;
        nearestDistance = distance;
      }
    }
    if (nearest) collect(registry, entry, nearest);
  }

  if (registry.entries.size === 0 && registry.timer) {
    clearInterval(registry.timer);
    registry.timer = undefined;
  }
};

const track = (map: LootMap, entry: LootEntry) => {
  let registry = registries.get(map);
  if (!registry) {
    registry = { entries: new Set() };
    registries.set(map, registry);
  }
  registry.entries.add(entry);
  if (!registry.timer) {
    const current = registry;
    current.timer = setInterval(() => stepRegistry(map, current), LOOT_TICK_MS);
  }
};

/**
 * Pop collectable loot into the world: gold is split into coins and every
 * item that passes its chance becomes a pickup. Pickups arc out of `x, y`,
 * then fly to the first eligible player within `magnetRadius`.
 *
 * Runtime ownership: the server rolls the drops, places them and grants them.
 * The client only animates the pop and the pickup. Works in standalone RPG and
 * MMORPG modes; with `ownership: "attacker"` the pickups are scenario events
 * that only the owner sees.
 *
 * Use it directly for chests, barrels or scripted rewards. Enemies use it
 * through `rewards.drop`.
 *
 * @param map - Map where the loot is spawned
 * @param options - Origin, reward table and loot settings
 * @returns Ids of the spawned pickup events
 *
 * @example
 * ```ts
 * import { dropActionBattleLoot } from "@rpgjs/action-battle/server";
 *
 * onAction(player) {
 *   dropActionBattleLoot(player.getCurrentMap()!, {
 *     x: this.x() + 16,
 *     y: this.y() + 16,
 *     rewards: { gold: 30, items: [{ itemId: "potion", chance: 50 }] },
 *   });
 * }
 * ```
 */
export const dropActionBattleLoot = async (
  map: LootMap,
  options: DropActionBattleLootOptions
): Promise<string[]> => {
  const settings = normalizeActionBattleLootOptions(options);
  const drops = rollActionBattleLoot(options.rewards, settings);
  if (drops.length === 0) return [];

  const owner = settings.ownership === "attacker" ? options.owner ?? undefined : undefined;
  const origin = { x: options.x, y: options.y };
  const landings = scatterActionBattleLoot(origin, drops.length, settings.spread);
  const spawnedAt = Date.now();
  const ids: string[] = [];

  await Promise.all(
    drops.map(async (drop, index) => {
      const landing = clampToMap(map, landings[index]);
      const delayMs = index * 45;
      const visual: ActionBattleLootVisual = {
        kind: drop.kind,
        amount: drop.amount,
        icon: resolveItemIcon(map, drop),
        fromX: Math.round(origin.x - landing.x),
        fromY: Math.round(origin.y - landing.y),
        height: settings.height,
        flightMs: settings.flightMs,
        delayMs,
        spawnedAt,
      };
      const id = await map.createDynamicEvent({
        id: `action-battle-loot-${++lootSequence}`,
        x: landing.x - LOOT_SIZE / 2,
        y: landing.y - LOOT_SIZE / 2,
        hitbox: { width: LOOT_SIZE, height: LOOT_SIZE },
        ...(owner ? { mode: EventMode.Scenario, scenarioOwnerId: owner.id } : {}),
        event: {
          name: "loot",
          onInit(this: RpgEvent) {
            (this as any).actionBattleLoot = true;
            this.through = true;
            this.setComponentsCenter(
              [Components.custom(ACTION_BATTLE_LOOT_COMPONENT_ID, { ...visual })],
              { width: 0, height: 0 }
            );
          },
        },
      });
      const event = id ? map.getEvent(id) : undefined;
      if (!id || !event) return;
      ids.push(id);
      track(map, {
        event,
        drop,
        ownerId: owner?.id,
        readyAt: spawnedAt + delayMs + settings.flightMs + settings.pickupDelayMs,
        expiresAt: spawnedAt + settings.despawnMs,
        options: settings,
        notify: options.rewards.showNotification === true,
        onCollect: options.onCollect,
        done: false,
      });
    })
  );
  return ids;
};
