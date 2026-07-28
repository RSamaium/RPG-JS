import {
  HOTBAR_SLOT_COUNT,
  PrebuiltGui,
  type HotbarEntry,
  type HotbarEntryPresentation,
  type HotbarSlot,
  type HotbarState,
  type PlayerCtor,
} from "@rpgjs/common";
import type { RpgPlayer } from "./Player";
import { context as injectionContext } from "../core/inject";

/** Authoritative context passed to a registered hotbar entry type. */
export interface HotbarUseContext {
  /** Zero-based slot used by the player. */
  slot: number;
  /** Optional targeting data supplied by the client or battle module. */
  target?: unknown;
}

/**
 * Server-side contract for a built-in or plugin-provided hotbar entry type.
 *
 * The definition owns availability validation, client presentation, and use so
 * serialized slot data never grants gameplay authority to the client.
 */
export interface HotbarEntryTypeDefinition {
  /** Unique serialized entry type. */
  type: string;
  /** Throw when the player may not assign or use this entry. */
  validate(player: RpgPlayer, id: string): void;
  /** Build the serializable presentation sent to the current player. */
  resolve(player: RpgPlayer, id: string): HotbarEntryPresentation;
  /** Execute the authoritative gameplay action. */
  use(
    player: RpgPlayer,
    id: string,
    context: HotbarUseContext,
  ): unknown | Promise<unknown>;
}

/** Static capacity or per-player capacity resolver, clamped between 1 and 10. */
export type HotbarCapacityResolver =
  | number
  | ((player: RpgPlayer) => number);

/** Static unlock hint or per-player, per-slot hint resolver. */
export type HotbarLockedSlotHintResolver =
  | string
  | ((player: RpgPlayer, slot: number) => string | undefined);

/** Per-player capacity and locked-slot presentation options. */
export interface HotbarConfiguration {
  /** Number of currently accessible slots or a dynamic player resolver. */
  capacity?: HotbarCapacityResolver;
  /** Player-visible unlock hint or a per-slot resolver. */
  lockedSlotHint?: HotbarLockedSlotHintResolver;
}

/** Payload delivered to the server `onHotbarChange` player hook. */
export interface HotbarChangePayload {
  /** Mutation or refresh that produced the snapshot. */
  action: "initialize" | "assign" | "clear" | "select" | "refresh";
  /** Affected zero-based slot when the action targets one slot. */
  slot?: number;
  /** Assigned or selected entry when available. */
  entry?: HotbarEntry;
  /** Detached state after the change. */
  state: HotbarState;
}

const entryTypes = new Map<string, HotbarEntryTypeDefinition>();
const playerConfigurations = new WeakMap<object, HotbarConfiguration>();

const readValue = <T = unknown>(value: unknown, fallback?: T): T => {
  const resolved = typeof value === "function"
    ? (value as () => unknown)()
    : value;
  return (resolved ?? fallback) as T;
};

const cloneEntry = (entry: HotbarSlot): HotbarSlot =>
  entry ? { type: entry.type, id: entry.id } : null;

const normalizeSlots = (slots: unknown): HotbarSlot[] => {
  const entries = Array.isArray(slots) ? slots : [];
  return Array.from({ length: HOTBAR_SLOT_COUNT }, (_, index) => {
    const entry = entries[index] as Partial<HotbarEntry> | null | undefined;
    if (
      !entry ||
      typeof entry.type !== "string" ||
      !entry.type ||
      typeof entry.id !== "string" ||
      !entry.id
    ) {
      return null;
    }
    return { type: entry.type, id: entry.id };
  });
};

const clampCapacity = (value: unknown) => {
  const capacity = Math.floor(Number(value));
  return Number.isFinite(capacity)
    ? Math.max(1, Math.min(HOTBAR_SLOT_COUNT, capacity))
    : HOTBAR_SLOT_COUNT;
};

const nativeSkillDefinition: HotbarEntryTypeDefinition = {
  type: "skill",
  validate(player, id) {
    if (!player.getSkill(id)) {
      throw new Error(`Skill "${id}" is not learned`);
    }
  },
  resolve(player, id) {
    const skill = player.getSkill(id);
    const data = (player as any).databaseById?.(id) ?? skill;
    const spCost = Number(readValue((skill as any)?.spCost, readValue(data?.spCost, 0)));
    return {
      id,
      type: "skill",
      name: String(readValue((skill as any)?.name, readValue(data?.name, id))),
      description: String(
        readValue((skill as any)?.description, readValue(data?.description, "")),
      ),
      icon: readValue(data?.icon, readValue((skill as any)?.icon)),
      cost: spCost > 0 ? { value: spCost, label: "SP" } : undefined,
      usable: Boolean(skill) && Number(player.sp ?? 0) >= spCost,
      activation: { mode: "instant" },
    };
  },
  use(player, id, context) {
    return player.useSkill(id, context.target as RpgPlayer | RpgPlayer[] | undefined);
  },
};

const nativeItemDefinition: HotbarEntryTypeDefinition = {
  type: "item",
  validate(player, id) {
    const item = player.getItem(id);
    if (!item) {
      throw new Error(`Item "${id}" is not in the inventory`);
    }
    const data = (player as any).databaseById?.(id) ?? item;
    const type = readValue(data?._type, "item");
    const consumable = readValue(data?.consumable, type === "item");
    if (type !== "item" || consumable === false) {
      throw new Error(`Item "${id}" is not usable from the hotbar`);
    }
  },
  resolve(player, id) {
    const item = player.getItem(id);
    const data = (player as any).databaseById?.(id) ?? item;
    const quantity = Number(readValue((item as any)?.quantity, 0));
    return {
      id,
      type: "item",
      name: String(readValue((item as any)?.name, readValue(data?.name, id))),
      description: String(
        readValue((item as any)?.description, readValue(data?.description, "")),
      ),
      icon: readValue(data?.icon, readValue((item as any)?.icon)),
      quantity,
      usable: Boolean(item) && quantity > 0,
      activation: { mode: "instant" },
    };
  },
  use(player, id) {
    return player.useItem(id);
  },
};

entryTypes.set(nativeSkillDefinition.type, nativeSkillDefinition);
entryTypes.set(nativeItemDefinition.type, nativeItemDefinition);

/**
 * Register a server-side hotbar entry type.
 *
 * The definition owns validation, client presentation, and authoritative use.
 * The returned function restores the previous definition.
 *
 * @param definition - Type definition shared by every player on this server.
 * @returns A cleanup function that restores the previous definition.
 *
 * @example
 * ```ts
 * const unregister = registerHotbarEntryType({
 *   type: "emote",
 *   validate(_player, id) {
 *     if (id !== "wave") throw new Error("Unknown emote");
 *   },
 *   resolve(_player, id) {
 *     return {
 *       id,
 *       type: "emote",
 *       name: "Wave",
 *       usable: true,
 *       activation: { mode: "instant" },
 *     };
 *   },
 *   use(player) {
 *     player.showAnimation("wave");
 *   },
 * });
 * ```
 */
export function registerHotbarEntryType(
  definition: HotbarEntryTypeDefinition,
): () => void {
  if (!definition?.type) {
    throw new TypeError("A hotbar entry type requires a non-empty type");
  }
  const previous = entryTypes.get(definition.type);
  entryTypes.set(definition.type, definition);
  return () => {
    if (previous) entryTypes.set(definition.type, previous);
    else entryTypes.delete(definition.type);
  };
}

/**
 * Return the registered definition for an entry type.
 *
 * @param type - Serialized entry type.
 * @returns The definition, or `undefined` when the type is unknown.
 */
export function getHotbarEntryType(type: string): HotbarEntryTypeDefinition | undefined {
  return entryTypes.get(type);
}

/**
 * Resolve the serializable client presentation for a hotbar entry.
 *
 * Unavailable or unknown entries return a disabled fallback instead of
 * exposing an authoritative validation error to the client.
 *
 * @param player - Player receiving the presentation.
 * @param entry - Persistent entry reference.
 * @returns Serializable presentation for the generic hotbar GUI.
 */
export function resolveHotbarEntryPresentation(
  player: RpgPlayer,
  entry: HotbarEntry,
): HotbarEntryPresentation {
  const definition = getHotbarEntryType(entry.type);
  if (!definition) {
    return {
      id: entry.id,
      type: entry.type,
      name: entry.id,
      usable: false,
      activation: { mode: "instant" as const },
    };
  }
  try {
    definition.validate(player, entry.id);
    return definition.resolve(player, entry.id);
  } catch {
    return {
      id: entry.id,
      type: entry.type,
      name: entry.id,
      usable: false,
      activation: { mode: "instant" as const },
    };
  }
}

export function WithHotbarManager<TBase extends PlayerCtor>(
  Base: TBase,
): new (...args: ConstructorParameters<TBase>) => InstanceType<TBase> & IHotbarManager {
  return class HotbarManagerMixin extends Base {
    private resolveConfiguredCapacity(current?: Partial<HotbarState>): number {
      const config = playerConfigurations.get(this);
      if (config?.capacity !== undefined) {
        const value = typeof config.capacity === "function"
          ? config.capacity(this as unknown as RpgPlayer)
          : config.capacity;
        return clampCapacity(value);
      }
      return clampCapacity(current?.capacity);
    }

    private normalizeHotbar(): HotbarState {
      const current = readValue<Partial<HotbarState>>((this as any).hotbar, {});
      const capacity = this.resolveConfiguredCapacity(current);
      const activeSlot = Number.isInteger(current.activeSlot)
        && Number(current.activeSlot) >= 0
        && Number(current.activeSlot) < capacity
        ? Number(current.activeSlot)
        : null;
      return {
        version: 2,
        initialized: current.initialized === true,
        capacity,
        activeSlot,
        slots: normalizeSlots(current.slots),
      };
    }

    private commitHotbar(
      state: HotbarState,
      payload: Omit<HotbarChangePayload, "state">,
    ): HotbarState {
      const capacity = this.resolveConfiguredCapacity(state);
      const next: HotbarState = {
        version: 2,
        initialized: state.initialized,
        capacity,
        activeSlot:
          state.activeSlot !== null
          && state.activeSlot >= 0
          && state.activeSlot < capacity
            ? state.activeSlot
            : null,
        slots: normalizeSlots(state.slots),
      };
      (this as any).hotbar.set(next);
      const gui = (this as any).getGui?.(PrebuiltGui.Hotbar);
      if (gui?.openId) gui.refresh?.();
      if (injectionContext || (this as any).context) {
        void (this as any).execMethod?.("onHotbarChange", [{
          ...payload,
          state: {
            ...next,
            slots: next.slots.map(cloneEntry),
          },
        }]);
      }
      return this.getHotbar();
    }

    private assertSlot(slot: number): void {
      if (!Number.isInteger(slot) || slot < 0 || slot >= HOTBAR_SLOT_COUNT) {
        throw new RangeError(
          `Hotbar slot must be an integer between 0 and ${HOTBAR_SLOT_COUNT - 1}`,
        );
      }
    }

    private assertAccessibleSlot(slot: number): void {
      this.assertSlot(slot);
      if (slot >= this.getHotbarCapacity()) {
        throw new RangeError(`Hotbar slot ${slot} is locked`);
      }
    }

    private assertEntryAvailable(entry: HotbarEntry): void {
      if (!entry?.id || typeof entry.type !== "string" || !entry.type) {
        throw new TypeError("Hotbar entry must reference a registered type");
      }
      const definition = getHotbarEntryType(entry.type);
      if (!definition) {
        throw new Error(`Hotbar entry type "${entry.type}" is not registered`);
      }
      definition.validate(this as unknown as RpgPlayer, entry.id);
    }

    private buildDefaultSlots(capacity: number): HotbarSlot[] {
      const slots: HotbarSlot[] = Array.from(
        { length: HOTBAR_SLOT_COUNT },
        () => null,
      );
      const overflow: HotbarEntry[] = [];
      const skills = readValue<any[]>((this as any).skills, []);

      for (const skill of skills) {
        const id = String(readValue(skill?.id, ""));
        if (!id) continue;
        const data = (this as any).databaseById?.(id) ?? skill?._skillData ?? skill;
        const key = String(readValue(data?.key, readValue(skill?.key, "")));
        const explicitSlot = key === "0"
          ? 9
          : /^[1-9]$/.test(key)
            ? Number(key) - 1
            : -1;
        const entry: HotbarEntry = { type: "skill", id };
        if (explicitSlot >= 0 && explicitSlot < capacity && !slots[explicitSlot]) {
          slots[explicitSlot] = entry;
        } else {
          overflow.push(entry);
        }
      }

      const items = readValue<any[]>((this as any).items, []);
      for (const item of items) {
        const id = String(readValue(item?.id, ""));
        if (!id) continue;
        try {
          nativeItemDefinition.validate(this as unknown as RpgPlayer, id);
          overflow.push({ type: "item", id });
        } catch {
          // Non-usable inventory entries are not seeded.
        }
      }

      for (const entry of overflow) {
        const index = slots.slice(0, capacity).findIndex((slot) => slot === null);
        if (index === -1) break;
        slots[index] = entry;
      }
      return slots;
    }

    /**
     * Configure dynamic capacity and locked-slot messaging for this player.
     *
     * The resolver is evaluated on refresh and gameplay changes. Reducing
     * capacity keeps assignments in locked slots so they return if capacity
     * grows again.
     *
     * @title Configure Hotbar
     * @method player.configureHotbar(options)
     * @param options - Capacity and optional locked-slot hint.
     * @returns The refreshed detached hotbar state.
     * @memberof RpgPlayer
     *
     * @example
     * ```ts
     * player.configureHotbar({
     *   capacity: current => Math.min(10, current.level + 2),
     *   lockedSlotHint: (_current, slot) => `Unlocks at level ${slot + 1}`,
     * });
     * ```
     */
    configureHotbar(options: HotbarConfiguration = {}): HotbarState {
      playerConfigurations.set(this, options);
      return this.refreshHotbar();
    }

    /**
     * Return a detached snapshot of the player's persistent hotbar.
     *
     * @title Get Hotbar
     * @method player.getHotbar()
     * @returns The current detached ten-slot state.
     * @memberof RpgPlayer
     */
    getHotbar(): HotbarState {
      const current = this.normalizeHotbar();
      return {
        ...current,
        slots: current.slots.map(cloneEntry),
      };
    }

    /**
     * Return the number of slots currently available to the player.
     *
     * @title Get Hotbar Capacity
     * @method player.getHotbarCapacity()
     * @returns An integer between 1 and 10.
     * @memberof RpgPlayer
     */
    getHotbarCapacity(): number {
      return this.normalizeHotbar().capacity;
    }

    /**
     * Return the optional unlock hint for a slot.
     *
     * @title Get Hotbar Locked Slot Hint
     * @method player.getHotbarLockedSlotHint(slot)
     * @param slot - Zero-based slot index.
     * @returns The resolved hint, or `undefined`.
     * @memberof RpgPlayer
     */
    getHotbarLockedSlotHint(slot: number): string | undefined {
      this.assertSlot(slot);
      const hint = playerConfigurations.get(this)?.lockedSlotHint;
      return typeof hint === "function"
        ? hint(this as unknown as RpgPlayer, slot)
        : hint;
    }

    /**
     * Re-evaluate dynamic configuration and refresh an open hotbar GUI.
     *
     * @title Refresh Hotbar
     * @method player.refreshHotbar()
     * @returns The refreshed detached hotbar state.
     * @memberof RpgPlayer
     */
    refreshHotbar(): HotbarState {
      const current = this.normalizeHotbar();
      return this.commitHotbar(current, { action: "refresh" });
    }

    /**
     * Seed the hotbar once from explicit entries or the player loadout.
     *
     * Learned skills are placed before usable consumable items when `entries`
     * is omitted. Invalid explicit entries are ignored. Calling this method
     * after initialization preserves the player's assignments.
     *
     * @title Initialize Hotbar
     * @method player.initializeHotbar(entries)
     * @param entries - Optional ordered skill, item, or plugin entry list.
     * @returns The initialized state, or the existing state when already seeded.
     * @memberof RpgPlayer
     *
     * @example
     * ```ts
     * player.initializeHotbar([
     *   { type: "item", id: "berry-snack" },
     *   { type: "skill", id: "water-crops" },
     * ]);
     * ```
     */
    initializeHotbar(entries?: HotbarEntry[]): HotbarState {
      const current = this.normalizeHotbar();
      if (current.initialized) return this.getHotbar();

      const slots: HotbarSlot[] = Array.from(
        { length: HOTBAR_SLOT_COUNT },
        () => null,
      );
      if (entries) {
        for (const entry of entries) {
          const index = slots
            .slice(0, current.capacity)
            .findIndex((slot) => slot === null);
          if (index === -1) break;
          try {
            this.assertEntryAvailable(entry);
            slots[index] = cloneEntry(entry);
          } catch {
            // Invalid initial entries are ignored.
          }
        }
      } else {
        const defaults = this.buildDefaultSlots(current.capacity);
        if (defaults.every((entry) => entry === null)) return this.getHotbar();
        defaults.forEach((entry, index) => {
          slots[index] = cloneEntry(entry);
        });
      }
      return this.commitHotbar(
        { ...current, initialized: true, slots },
        { action: "initialize" },
      );
    }

    /**
     * Assign an available slot, moving any duplicate entry.
     *
     * @title Assign Hotbar Slot
     * @method player.assignHotbarSlot(slot,entry)
     * @param slot - Zero-based accessible slot index.
     * @param entry - Available skill, item, or registered plugin entry.
     * @returns The updated detached state.
     * @memberof RpgPlayer
     */
    assignHotbarSlot(slot: number, entry: HotbarEntry): HotbarState {
      this.assertAccessibleSlot(slot);
      this.assertEntryAvailable(entry);
      const current = this.normalizeHotbar();
      const slots = current.slots.map((candidate) =>
        candidate?.type === entry.type && candidate.id === entry.id
          ? null
          : cloneEntry(candidate)
      );
      slots[slot] = cloneEntry(entry);
      return this.commitHotbar(
        { ...current, initialized: true, slots },
        { action: "assign", slot, entry: cloneEntry(entry) as HotbarEntry },
      );
    }

    /**
     * Clear a slot while preserving all other assignments.
     *
     * @title Clear Hotbar Slot
     * @method player.clearHotbarSlot(slot)
     * @param slot - Zero-based slot index, including a currently locked slot.
     * @returns The updated detached state.
     * @memberof RpgPlayer
     */
    clearHotbarSlot(slot: number): HotbarState {
      this.assertSlot(slot);
      const current = this.normalizeHotbar();
      const slots = current.slots.map(cloneEntry);
      slots[slot] = null;
      return this.commitHotbar(
        {
          ...current,
          activeSlot: current.activeSlot === slot ? null : current.activeSlot,
          slots,
        },
        { action: "clear", slot },
      );
    }

    /**
     * Persist the player's active available slot.
     *
     * @title Select Hotbar Slot
     * @method player.selectHotbarSlot(slot)
     * @param slot - Zero-based accessible slot index.
     * @returns The updated detached state.
     * @memberof RpgPlayer
     */
    selectHotbarSlot(slot: number): HotbarState {
      this.assertAccessibleSlot(slot);
      const current = this.normalizeHotbar();
      return this.commitHotbar(
        { ...current, activeSlot: slot },
        { action: "select", slot, entry: cloneEntry(current.slots[slot]) ?? undefined },
      );
    }

    /**
     * Use an entry through its registered authoritative type handler.
     *
     * @title Use Hotbar Slot
     * @method player.useHotbarSlot(slot,target)
     * @param slot - Zero-based accessible slot index.
     * @param target - Optional target understood by the entry definition.
     * @returns The entry handler result, or `null` for an empty slot.
     * @memberof RpgPlayer
     */
    useHotbarSlot(slot: number, target?: unknown): unknown {
      this.assertAccessibleSlot(slot);
      const current = this.normalizeHotbar();
      const entry = current.slots[slot];
      if (!entry) return null;
      this.assertEntryAvailable(entry);
      const definition = getHotbarEntryType(entry.type)!;
      this.commitHotbar(
        { ...current, activeSlot: slot },
        { action: "select", slot, entry: cloneEntry(entry) as HotbarEntry },
      );
      return definition.use(this as unknown as RpgPlayer, entry.id, {
        slot,
        target,
      });
    }

    /**
     * Use the currently active slot, if one is selected.
     *
     * @title Use Active Hotbar Slot
     * @method player.useActiveHotbarSlot(target)
     * @param target - Optional target understood by the entry definition.
     * @returns The entry handler result, or `null` when no slot is active.
     * @memberof RpgPlayer
     */
    useActiveHotbarSlot(target?: unknown): unknown {
      const activeSlot = this.getHotbar().activeSlot;
      return activeSlot === null ? null : this.useHotbarSlot(activeSlot, target);
    }
  } as any;
}

export interface IHotbarManager {
  configureHotbar(options?: HotbarConfiguration): HotbarState;
  getHotbar(): HotbarState;
  getHotbarCapacity(): number;
  getHotbarLockedSlotHint(slot: number): string | undefined;
  refreshHotbar(): HotbarState;
  initializeHotbar(entries?: HotbarEntry[]): HotbarState;
  assignHotbarSlot(slot: number, entry: HotbarEntry): HotbarState;
  clearHotbarSlot(slot: number): HotbarState;
  selectHotbarSlot(slot: number): HotbarState;
  useHotbarSlot(slot: number, target?: unknown): unknown;
  useActiveHotbarSlot(target?: unknown): unknown;
}
