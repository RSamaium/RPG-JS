import {
  HOTBAR_SLOT_COUNT,
  PrebuiltGui,
  type HotbarEntry,
  type HotbarEntryPresentation,
} from "@rpgjs/common";
import type { RpgPlayer } from "../Player/Player";
import {
  resolveHotbarEntryPresentation,
  type HotbarConfiguration,
} from "../Player/HotbarManager";
import { Gui } from "./Gui";

/** Authoritative use request passed to a custom `showHotbar()` handler. */
export interface HotbarUseRequest {
  /** Zero-based slot requested by the client. */
  slot: number;
  /** Entry stored in the slot at request time. */
  entry: HotbarEntry;
  /** Optional targeting data supplied by a client activation handler. */
  target?: unknown;
}

/** Short-lived visual feedback sent to the built-in client component. */
export interface HotbarActionFeedback {
  /** Monotonic value used to replay feedback for repeated actions. */
  revision: number;
  /** Zero-based slot receiving feedback. */
  slot: number;
  /** Result rendered by the client animation. */
  status: "used" | "selected" | "rejected";
}

/** Options accepted by `player.showHotbar()`. */
export interface HotbarGuiOptions extends HotbarConfiguration {
  /**
   * Initialize from the player's loadout when opening or refreshing.
   * @default true
   */
  autoInitialize?: boolean;
  /**
   * Optional authoritative override for entry execution.
   *
   * Return `false` to reject the action. The server still owns validation and
   * gameplay state.
   */
  onUse?: (
    player: RpgPlayer,
    request: HotbarUseRequest,
  ) => unknown | Promise<unknown>;
  /** Customize the serializable presentation for this GUI instance. */
  transformEntry?: (
    player: RpgPlayer,
    entry: HotbarEntry,
    presentation: HotbarEntryPresentation,
  ) => HotbarEntryPresentation;
}

const formatSlot = (
  player: RpgPlayer,
  index: number,
  options: HotbarGuiOptions,
) => {
  const hotbar = player.getHotbar();
  const entry = hotbar.slots[index];
  const locked = index >= hotbar.capacity;
  if (!entry || !player.isHotbarEntryTypeAllowed(entry.type)) {
    return {
      index,
      type: "empty" as const,
      entry: null,
      usable: false,
      locked,
      lockedHint: locked ? player.getHotbarLockedSlotHint(index) : undefined,
    };
  }
  const base = resolveHotbarEntryPresentation(player, entry);
  const presentation = options.transformEntry
    ? options.transformEntry(player, entry, base)
    : base;
  return {
    index,
    ...presentation,
    entry,
    usable: !locked && presentation.usable !== false,
    locked,
    lockedHint: locked ? player.getHotbarLockedSlotHint(index) : undefined,
  };
};

/**
 * Build the renderer-neutral data contract consumed by `rpg-hotbar`.
 *
 * @param player - Player receiving the GUI.
 * @param options - Capacity, presentation, and use options.
 * @param feedback - Optional transient interaction feedback.
 * @returns Serializable state, allowed built-in assignment types, and ten
 * presentation slots.
 */
export const buildPlayerHotbarData = (
  player: RpgPlayer,
  options: HotbarGuiOptions = {},
  feedback?: HotbarActionFeedback,
) => {
  const hotbar = player.getHotbar();
  return {
    hotbar,
    capacity: hotbar.capacity,
    activeSlot: hotbar.activeSlot,
    allowedEntryTypes: ["skill", "item"].filter((type) =>
      player.isHotbarEntryTypeAllowed(type)
    ),
    slots: Array.from(
      { length: HOTBAR_SLOT_COUNT },
      (_, index) => formatSlot(player, index, options),
    ),
    feedback,
  };
};

export class HotbarGui extends Gui {
  private options: HotbarGuiOptions = {};
  private feedbackRevision = 0;
  private feedback?: HotbarActionFeedback;
  private ready = false;
  private initializing = false;

  constructor(player: RpgPlayer) {
    super(PrebuiltGui.Hotbar, player);
  }

  configure(options: HotbarGuiOptions = {}): void {
    this.options = options;
    this.player.configureHotbar(options);
  }

  refresh(clientActionId?: string): void {
    if (
      !this.initializing
      && this.options.autoInitialize !== false
      && !this.player.getHotbar().initialized
    ) {
      this.initializing = true;
      try {
        this.player.initializeHotbar();
      } finally {
        this.initializing = false;
      }
    }
    this.update(
      buildPlayerHotbarData(this.player, this.options, this.feedback),
      { clientActionId },
    );
  }

  private setFeedback(
    slot: number,
    status: HotbarActionFeedback["status"],
  ): void {
    this.feedback = {
      revision: ++this.feedbackRevision,
      slot,
      status,
    };
  }

  open(options: HotbarGuiOptions = {}): Promise<unknown | null> {
    this.configure(options);
    if (options.autoInitialize !== false) this.player.initializeHotbar();

    if (!this.ready) {
      this.ready = true;
      this.on("selectSlot", ({
        slot,
        clientActionId,
      }: {
        slot: number;
        clientActionId?: string;
      }) => {
        try {
          this.player.selectHotbarSlot(slot);
          this.setFeedback(slot, "selected");
        } catch {
          this.setFeedback(slot, "rejected");
        } finally {
          this.refresh(clientActionId);
        }
      });
      this.on("useSlot", async ({
        slot,
        target,
        clientActionId,
      }: {
        slot: number;
        target?: unknown;
        clientActionId?: string;
      }) => {
        const entry = this.player.getHotbar().slots[slot];
        if (!entry || !this.player.isHotbarEntryTypeAllowed(entry.type)) {
          this.setFeedback(slot, "rejected");
          this.refresh(clientActionId);
          return;
        }
        try {
          this.player.selectHotbarSlot(slot);
          const result = this.options.onUse
            ? await this.options.onUse(this.player, { slot, entry, target })
            : await this.player.useHotbarSlot(slot, target);
          if (result === false) {
            throw new Error("Hotbar entry use was rejected");
          }
          this.setFeedback(slot, "used");
        } catch {
          this.setFeedback(slot, "rejected");
        } finally {
          this.refresh(clientActionId);
        }
      });
      this.on("useActiveSlot", async ({
        target,
        clientActionId,
      }: {
        target?: unknown;
        clientActionId?: string;
      }) => {
        const slot = this.player.getHotbar().activeSlot;
        if (slot === null) return;
        const entry = this.player.getHotbar().slots[slot];
        if (!entry || !this.player.isHotbarEntryTypeAllowed(entry.type)) return;
        try {
          const result = this.options.onUse
            ? await this.options.onUse(this.player, { slot, entry, target })
            : await this.player.useActiveHotbarSlot(target);
          if (result === false) {
            throw new Error("Hotbar entry use was rejected");
          }
          this.setFeedback(slot, "used");
        } catch {
          this.setFeedback(slot, "rejected");
        } finally {
          this.refresh(clientActionId);
        }
      });
      this.on("refresh", () => this.refresh());
    }

    return super.open(buildPlayerHotbarData(this.player, this.options));
  }
}
