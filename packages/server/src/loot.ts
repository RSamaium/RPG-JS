import {
  DEFAULT_LOOT_MAGNET_RADIUS,
  LOOT_COMPONENT_ID,
  LOOT_TOUCH_RADIUS,
  normalizeLootOptions,
  resolveItemLootConfig,
  rollLoot,
  scatterLoot,
  type ItemLootConfig,
  type LootDrop,
  type LootOptions,
  type LootRewards,
  type LootVisual,
  type NormalizedLootOptions,
} from "@rpgjs/common";
import { Components } from "./Player/Components";
import { EventMode } from "./decorators/event";
import type { RpgEvent, RpgPlayer } from "./Player/Player";
import type { RpgMap } from "./rooms/map";

/** Hitbox of a pickup. Small, so pickups never block movement or attacks. */
const LOOT_SIZE = 16;
/** Time the client keeps a collected pickup to fly it to the collector. */
const LOOT_COLLECT_MS = 260;
const LOOT_EXPIRE_MS = 400;

export interface LootCollectContext {
  player: RpgPlayer;
  drop: LootDrop;
  event: RpgEvent;
}

/**
 * Options of `map.dropLoot()`, `event.dropLoot()` and `player.dropLoot()`.
 */
export interface DropLootOptions extends LootOptions<RpgPlayer> {
  /** Player that owns the loot when `ownership` is `player`. */
  owner?: RpgPlayer | null;
  /** Return `false` to leave the pickup on the ground (full inventory...). */
  canCollect?: (context: LootCollectContext) => boolean;
  /** Called on the server right after a player collected a pickup. */
  onCollect?: (context: LootCollectContext) => void;
}

export interface MapDropLootOptions extends DropLootOptions {
  /** World position the pickups pop from. */
  x: number;
  y: number;
  /** Reward table rolled into pickups: gold piles and item chances. */
  rewards: LootRewards;
}

interface LootEntry {
  event: RpgEvent;
  drop: LootDrop;
  ownerId?: string;
  readyAt: number;
  expiresAt: number;
  settings: NormalizedLootOptions;
  item: ItemLootConfig;
  magnetRadius: number | ((player: RpgPlayer) => number);
  notify: boolean;
  canCollect?: DropLootOptions["canCollect"];
  onCollect?: DropLootOptions["onCollect"];
  done: boolean;
}

let lootSequence = 0;

const centerOf = (entity: any) => {
  const hitbox = entity.hitbox?.() ?? { w: 32, h: 32 };
  return { x: entity.x() + hitbox.w / 2, y: entity.y() + hitbox.h / 2 };
};

const readField = (value: any) => (typeof value === "function" ? value() : value);

/** True for events spawned by `dropLoot()`. */
export const isLootEvent = (event: unknown): boolean => !!(event as any)?.__rpgLoot;

/**
 * Server-side registry of the loot pickups of one map.
 *
 * The map steps it on every physics tick. Pickups are dynamic events, so their
 * position, visibility (scenario events for owned loot) and removal use the
 * regular event synchronization.
 */
export class RpgMapLoot {
  private readonly entries = new Map<string, LootEntry>();

  constructor(private readonly map: RpgMap) {}

  private itemData(drop: LootDrop): any {
    if (drop.kind !== "item") return undefined;
    if (typeof drop.item === "string") return (this.map as any).database?.()?.[drop.item];
    return drop.item;
  }

  private clampToMap(point: { x: number; y: number }) {
    const data = (this.map as any).data?.();
    const width = Number(data?.width);
    const height = Number(data?.height);
    const half = LOOT_SIZE / 2;
    return {
      x: Number.isFinite(width) && width > 0 ? Math.min(Math.max(point.x, half), width - half) : point.x,
      y: Number.isFinite(height) && height > 0 ? Math.min(Math.max(point.y, half), height - half) : point.y,
    };
  }

  /**
   * Pop collectable loot at a world position. See `RpgMap.dropLoot()`.
   */
  async drop(options: MapDropLootOptions): Promise<string[]> {
    const settings = normalizeLootOptions(options);
    const drops = rollLoot(options.rewards, options);
    if (drops.length === 0) return [];

    const owner = settings.ownership === "player" ? options.owner ?? undefined : undefined;
    const origin = { x: options.x, y: options.y };
    const landings = scatterLoot(origin, drops.length, settings.spread);
    const spawnedAt = Date.now();
    const ids: string[] = [];
    const loot = this;

    await Promise.all(
      drops.map(async (drop, index) => {
        const data = this.itemData(drop);
        const item = resolveItemLootConfig(readField(data?.loot), options.item);
        const landing = this.clampToMap(landings[index]);
        const delayMs = index * 45;
        const visual: LootVisual = {
          kind: drop.kind,
          amount: drop.amount,
          fromX: Math.round(origin.x - landing.x),
          fromY: Math.round(origin.y - landing.y),
          height: settings.height,
          flightMs: settings.flightMs,
          delayMs,
          spawnedAt,
        };
        const icon = readField(data?.icon);
        const name = readField(data?.name);
        const sound = item.sound ?? settings.pickupSound;
        if (typeof icon === "string") visual.icon = icon;
        if (typeof name === "string") visual.name = name;
        if (item.visual) visual.visual = item.visual;
        if (item.color) visual.color = item.color;
        if (item.rarity) visual.rarity = item.rarity;
        if (sound) visual.sound = sound;

        const id = await this.map.createDynamicEvent({
          id: `rpg-loot-${++lootSequence}`,
          x: landing.x - LOOT_SIZE / 2,
          y: landing.y - LOOT_SIZE / 2,
          hitbox: { width: LOOT_SIZE, height: LOOT_SIZE },
          ...(owner ? { mode: EventMode.Scenario, scenarioOwnerId: owner.id } : {}),
          event: {
            name: "loot",
            onInit(this: RpgEvent) {
              (this as any).__rpgLoot = settings.pickup;
              this.through = true;
              this.setComponentsCenter(
                [Components.custom(LOOT_COMPONENT_ID, { ...visual })],
                { width: 0, height: 0 }
              );
            },
            onAction(this: RpgEvent, player: RpgPlayer) {
              loot.collectWithAction(this, player);
            },
          },
        });
        const event = id ? this.map.getEvent(id) : undefined;
        if (!id || !event) return;
        ids.push(id);
        const lifetime = item.rarity === "rare" || item.rarity === "epic" ? settings.despawnMs * 2 : settings.despawnMs;
        this.entries.set(id, {
          event,
          drop,
          ownerId: owner?.id,
          readyAt: spawnedAt + delayMs + settings.flightMs + settings.magnetDelayMs,
          expiresAt: spawnedAt + lifetime,
          settings,
          item,
          magnetRadius: options.magnet?.radius ?? DEFAULT_LOOT_MAGNET_RADIUS,
          notify: options.rewards.showNotification === true,
          canCollect: options.canCollect,
          onCollect: options.onCollect,
          done: false,
        });
      })
    );
    return ids;
  }

  private canPlayerCollect(entry: LootEntry, player: RpgPlayer): boolean {
    if (entry.done) return false;
    if (entry.ownerId && player.id !== entry.ownerId) return false;
    if ((player as any).hp !== undefined && (player as any).hp <= 0) return false;
    if (entry.canCollect?.({ player, drop: entry.drop, event: entry.event }) === false) return false;
    return true;
  }

  private collectWithAction(event: RpgEvent, player: RpgPlayer) {
    const entry = this.entries.get(event.id);
    if (!entry || entry.settings.pickup !== "action") return;
    if (Date.now() < entry.readyAt) return;
    if (!this.canPlayerCollect(entry, player)) return;
    this.collect(entry, player);
  }

  private grant(entry: LootEntry, player: RpgPlayer) {
    const { drop } = entry;
    if (drop.kind === "gold") {
      player.gold += drop.amount;
      return;
    }
    const inventoryItem = player.addItem(drop.item as any, drop.amount);
    if (entry.item.use && drop.itemId) {
      for (let i = 0; i < drop.amount; i++) {
        try {
          player.useItem(drop.itemId);
        } catch {
          // The item cannot be used now (restriction, no effect): it stays in the inventory.
          break;
        }
      }
      return;
    }
    if (entry.notify) {
      const name = readField((inventoryItem as any)?.name) ?? readField(this.itemData(drop)?.name) ?? drop.itemId;
      player.showNotification(
        player.t("rpg.notification.reward.item", { amount: drop.amount, name }),
        { icon: readField(this.itemData(drop)?.icon) }
      );
    }
  }

  private collect(entry: LootEntry, player: RpgPlayer) {
    entry.done = true;
    this.entries.delete(entry.event.id);
    this.grant(entry, player);
    entry.onCollect?.({ player, drop: entry.drop, event: entry.event });
    entry.event.remove({
      reason: "collected",
      data: { collectorId: player.id },
      timeoutMs: LOOT_COLLECT_MS,
    });
  }

  private pickupRadius(entry: LootEntry, player: RpgPlayer): number {
    if (entry.settings.pickup === "touch") return LOOT_TOUCH_RADIUS;
    const radius = entry.magnetRadius;
    const value = typeof radius === "function" ? radius(player) : radius;
    return Number.isFinite(value) ? value : DEFAULT_LOOT_MAGNET_RADIUS;
  }

  /**
   * Collect, expire or keep every pickup. Called by the map on each tick.
   *
   * @param now - Current time in milliseconds
   */
  step(now: number = Date.now()): void {
    if (this.entries.size === 0) return;
    const players = this.map.getPlayers();
    for (const entry of [...this.entries.values()]) {
      if (entry.done) continue;
      if (!this.map.getEvent(entry.event.id)) {
        this.entries.delete(entry.event.id);
        continue;
      }
      if (entry.settings.despawnMs > 0 && now >= entry.expiresAt) {
        entry.done = true;
        this.entries.delete(entry.event.id);
        entry.event.remove({ reason: "expired", timeoutMs: LOOT_EXPIRE_MS });
        continue;
      }
      if (entry.settings.pickup === "action" || now < entry.readyAt) continue;

      const loot = centerOf(entry.event);
      let nearest: RpgPlayer | undefined;
      let nearestDistance = Infinity;
      for (const player of players) {
        const position = centerOf(player);
        const distance = Math.hypot(position.x - loot.x, position.y - loot.y);
        if (distance > this.pickupRadius(entry, player) || distance >= nearestDistance) continue;
        if (!this.canPlayerCollect(entry, player)) continue;
        nearest = player;
        nearestDistance = distance;
      }
      if (nearest) this.collect(entry, nearest);
    }
  }

  /** Forget every pickup, for example when the map physics is cleared. */
  clear(): void {
    this.entries.clear();
  }
}
