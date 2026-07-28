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

export interface HotbarUseContext {
  slot: number;
  target?: unknown;
}

export interface HotbarEntryTypeDefinition {
  type: string;
  validate(player: RpgPlayer, id: string): void;
  resolve(player: RpgPlayer, id: string): HotbarEntryPresentation;
  use(
    player: RpgPlayer,
    id: string,
    context: HotbarUseContext,
  ): unknown | Promise<unknown>;
}

export type HotbarCapacityResolver =
  | number
  | ((player: RpgPlayer) => number);

export type HotbarLockedSlotHintResolver =
  | string
  | ((player: RpgPlayer, slot: number) => string | undefined);

export interface HotbarConfiguration {
  capacity?: HotbarCapacityResolver;
  lockedSlotHint?: HotbarLockedSlotHintResolver;
}

export interface HotbarChangePayload {
  action: "initialize" | "assign" | "clear" | "select" | "refresh";
  slot?: number;
  entry?: HotbarEntry;
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
 */
export const registerHotbarEntryType = (
  definition: HotbarEntryTypeDefinition,
): (() => void) => {
  if (!definition?.type) {
    throw new TypeError("A hotbar entry type requires a non-empty type");
  }
  const previous = entryTypes.get(definition.type);
  entryTypes.set(definition.type, definition);
  return () => {
    if (previous) entryTypes.set(definition.type, previous);
    else entryTypes.delete(definition.type);
  };
};

/**
 * Return the registered definition for an entry type.
 */
export const getHotbarEntryType = (type: string) => entryTypes.get(type);

/**
 * Resolve the serializable client presentation for a hotbar entry.
 */
export const resolveHotbarEntryPresentation = (
  player: RpgPlayer,
  entry: HotbarEntry,
) => {
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
};

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
      void (this as any).execMethod?.("onHotbarChange", [{
        ...payload,
        state: {
          ...next,
          slots: next.slots.map(cloneEntry),
        },
      }]);
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
     */
    configureHotbar(options: HotbarConfiguration = {}): HotbarState {
      playerConfigurations.set(this, options);
      return this.refreshHotbar();
    }

    /**
     * Return a detached snapshot of the player's persistent hotbar.
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
     */
    getHotbarCapacity(): number {
      return this.normalizeHotbar().capacity;
    }

    /**
     * Return the optional unlock hint for a slot.
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
     */
    refreshHotbar(): HotbarState {
      const current = this.normalizeHotbar();
      return this.commitHotbar(current, { action: "refresh" });
    }

    /**
     * Seed the hotbar once from explicit entries or the player loadout.
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
