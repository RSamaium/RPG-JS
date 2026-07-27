import {
  HOTBAR_SLOT_COUNT,
  PrebuiltGui,
  type Item,
  type HotbarEntry,
  type HotbarSlot,
  type HotbarState,
  type PlayerCtor,
} from "@rpgjs/common";
import type { RpgPlayer } from "./Player";
import type { SkillData } from "./SkillManager";

export interface HotbarChangePayload {
  action: "initialize" | "assign" | "clear";
  slot?: number;
  entry?: HotbarEntry;
  state: HotbarState;
}

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
      (entry.type !== "skill" && entry.type !== "item") ||
      typeof entry.id !== "string" ||
      !entry.id
    ) {
      return null;
    }
    return { type: entry.type, id: entry.id };
  });
};

/**
 * Adds a server-authoritative, persistent skill and item hotbar to a player.
 *
 * The hotbar content is synchronized through the player's `hotbar` signal. The
 * physical keyboard and gamepad bindings remain client configuration.
 */
export function WithHotbarManager<TBase extends PlayerCtor>(
  Base: TBase,
): new (...args: ConstructorParameters<TBase>) => InstanceType<TBase> & IHotbarManager {
  return class HotbarManagerMixin extends Base {
    private normalizeHotbar(): HotbarState {
      const current = readValue<Partial<HotbarState>>((this as any).hotbar, {});
      return {
        version: 1,
        initialized: current.initialized === true,
        slots: normalizeSlots(current.slots),
      };
    }

    private commitHotbar(
      state: HotbarState,
      payload: Omit<HotbarChangePayload, "state">,
    ): HotbarState {
      const next = {
        version: 1 as const,
        initialized: state.initialized,
        slots: normalizeSlots(state.slots),
      };
      (this as any).hotbar.set(next);
      const gui = (this as any).getGui?.(PrebuiltGui.Hotbar);
      if (gui?.openId) {
        gui.refresh?.();
      }
      void (this as any).execMethod?.("onHotbarChange", [{
        ...payload,
        state: {
          ...next,
          slots: next.slots.map(cloneEntry),
        },
      }]);
      return next;
    }

    private assertSlot(slot: number): void {
      if (
        !Number.isInteger(slot) ||
        slot < 0 ||
        slot >= HOTBAR_SLOT_COUNT
      ) {
        throw new RangeError(
          `Hotbar slot must be an integer between 0 and ${HOTBAR_SLOT_COUNT - 1}`,
        );
      }
    }

    private assertEntryAvailable(entry: HotbarEntry): void {
      if (!entry?.id || (entry.type !== "skill" && entry.type !== "item")) {
        throw new TypeError("Hotbar entry must reference a skill or item");
      }
      if (entry.type === "skill" && !(this as any).getSkill?.(entry.id)) {
        throw new Error(`Skill "${entry.id}" is not learned`);
      }
      if (entry.type === "item") {
        const item = (this as any).getItem?.(entry.id);
        if (!item) {
          throw new Error(`Item "${entry.id}" is not in the inventory`);
        }
        const data = (this as any).databaseById?.(entry.id) ?? item;
        const type = readValue(data?._type, "item");
        const consumable = readValue(data?.consumable, type === "item");
        if (type !== "item" || consumable === false) {
          throw new Error(`Item "${entry.id}" is not usable from the hotbar`);
        }
      }
    }

    private buildDefaultSlots(): HotbarSlot[] {
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
        if (explicitSlot >= 0 && !slots[explicitSlot]) {
          slots[explicitSlot] = entry;
        } else {
          overflow.push(entry);
        }
      }

      const items = readValue<any[]>((this as any).items, []);
      for (const item of items) {
        const id = String(readValue(item?.id, ""));
        if (!id) continue;
        const data = (this as any).databaseById?.(id) ?? item;
        const type = readValue(data?._type, "item");
        const consumable = readValue(data?.consumable, type === "item");
        if (type === "item" && consumable !== false) {
          overflow.push({ type: "item", id });
        }
      }

      for (const entry of overflow) {
        const index = slots.findIndex((slot) => slot === null);
        if (index === -1) break;
        slots[index] = entry;
      }
      return slots;
    }

    /**
     * Return a clone of the player's hotbar.
     *
     * @title Get Hotbar
     * @method player.getHotbar()
     * @returns The persistent ten-slot hotbar state.
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
     * Seed an uninitialized hotbar. Calling it again preserves player choices.
     *
     * @title Initialize Hotbar
     * @method player.initializeHotbar(entries)
     * @param entries - Optional entries placed from the first slot onward.
     * @returns The initialized hotbar state.
     * @memberof RpgPlayer
     *
     * @example
     * ```ts
     * player.initializeHotbar([
     *   { type: "skill", id: "fireball" },
     *   { type: "item", id: "potion" },
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
          if (slots.every(Boolean)) break;
          try {
            this.assertEntryAvailable(entry);
          } catch {
            continue;
          }
          const index = slots.findIndex((slot) => slot === null);
          slots[index] = cloneEntry(entry);
        }
      } else {
        const defaultSlots = this.buildDefaultSlots();
        if (defaultSlots.every((entry) => entry === null)) {
          return this.getHotbar();
        }
        for (const [index, entry] of defaultSlots.entries()) {
          if (!entry) continue;
          try {
            this.assertEntryAvailable(entry);
            slots[index] = cloneEntry(entry);
          } catch {
            // Ignore database entries no longer owned by the player.
          }
        }
      }
      return this.commitHotbar(
        { version: 1, initialized: true, slots },
        { action: "initialize" },
      );
    }

    /**
     * Assign a learned skill or usable inventory item to a slot.
     *
     * Assigning the same entry to another slot moves it instead of duplicating
     * it.
     *
     * @title Assign Hotbar Slot
     * @method player.assignHotbarSlot(slot, entry)
     * @param slot - Zero-based slot index from 0 to 9.
     * @param entry - Skill or item reference.
     * @returns The updated hotbar state.
     * @memberof RpgPlayer
     */
    assignHotbarSlot(slot: number, entry: HotbarEntry): HotbarState {
      this.assertSlot(slot);
      this.assertEntryAvailable(entry);
      const current = this.normalizeHotbar();
      const slots = current.slots.map((candidate) =>
        candidate?.type === entry.type && candidate.id === entry.id
          ? null
          : cloneEntry(candidate)
      );
      slots[slot] = cloneEntry(entry);
      return this.commitHotbar(
        { version: 1, initialized: true, slots },
        { action: "assign", slot, entry: cloneEntry(entry) as HotbarEntry },
      );
    }

    /**
     * Clear a hotbar slot without shifting the remaining entries.
     *
     * @title Clear Hotbar Slot
     * @method player.clearHotbarSlot(slot)
     * @param slot - Zero-based slot index from 0 to 9.
     * @returns The updated hotbar state.
     * @memberof RpgPlayer
     */
    clearHotbarSlot(slot: number): HotbarState {
      this.assertSlot(slot);
      const current = this.normalizeHotbar();
      const slots = current.slots.map(cloneEntry);
      slots[slot] = null;
      return this.commitHotbar(
        { version: 1, initialized: true, slots },
        { action: "clear", slot },
      );
    }

    /**
     * Use the entry assigned to a slot with standard RPGJS item/skill rules.
     *
     * Battle modules may resolve the entry with `getHotbar()` and provide their
     * own targeting before invoking their authoritative action.
     *
     * @title Use Hotbar Slot
     * @method player.useHotbarSlot(slot, target)
     * @param slot - Zero-based slot index from 0 to 9.
     * @param target - Optional skill target or targets.
     * @returns The used skill/item data, or `null` for an empty slot.
     * @memberof RpgPlayer
     */
    useHotbarSlot(
      slot: number,
      target?: RpgPlayer | RpgPlayer[],
    ): SkillData | Item | null {
      this.assertSlot(slot);
      const entry = this.normalizeHotbar().slots[slot];
      if (!entry) return null;
      this.assertEntryAvailable(entry);
      return entry.type === "skill"
        ? (this as any).useSkill(entry.id, target)
        : (this as any).useItem(entry.id);
    }
  } as any;
}

export interface IHotbarManager {
  getHotbar(): HotbarState;
  initializeHotbar(entries?: HotbarEntry[]): HotbarState;
  assignHotbarSlot(slot: number, entry: HotbarEntry): HotbarState;
  clearHotbarSlot(slot: number): HotbarState;
  useHotbarSlot(
    slot: number,
    target?: RpgPlayer | RpgPlayer[],
  ): SkillData | Item | null;
}
