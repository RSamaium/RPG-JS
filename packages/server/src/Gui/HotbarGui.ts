import {
  createHotbarState,
  HOTBAR_SLOT_COUNT,
  PrebuiltGui,
  type HotbarEntry,
  type HotbarSlot,
} from "@rpgjs/common";
import type { RpgPlayer } from "../Player/Player";
import { Gui } from "./Gui";

export interface HotbarUseRequest {
  slot: number;
  entry: HotbarEntry;
  target?: unknown;
}

export interface HotbarGuiOptions {
  autoInitialize?: boolean;
  onUse?: (
    player: RpgPlayer,
    request: HotbarUseRequest,
  ) => unknown | Promise<unknown>;
}

const readValue = (value: unknown, fallback?: unknown) =>
  (typeof value === "function" ? (value as () => unknown)() : value) ?? fallback;

export const buildPlayerHotbarData = (player: RpgPlayer) => {
  const hotbar = typeof player.getHotbar === "function"
    ? player.getHotbar()
    : createHotbarState();
  const slots = hotbar.slots.map((entry: HotbarSlot, index: number) => {
    if (!entry) {
      return { index, type: "empty", entry: null, usable: false };
    }

    if (entry.type === "skill") {
      const skill = player.getSkill(entry.id);
      const data = (player as any).databaseById?.(entry.id) ?? skill;
      return {
        index,
        type: "skill",
        entry,
        id: entry.id,
        name: readValue((skill as any)?.name, readValue(data?.name, entry.id)),
        description: readValue(
          (skill as any)?.description,
          readValue(data?.description, ""),
        ),
        icon: readValue(data?.icon, readValue((skill as any)?.icon)),
        spCost: Number(
          readValue((skill as any)?.spCost, readValue(data?.spCost, 0)),
        ),
        range: Number(readValue(data?.targeting?.range, 0)),
        aoeMask: readValue(data?.targeting?.aoeMask),
        action: readValue(data?.action),
        usable: Boolean(skill) && Number(player.sp ?? 0) >= Number(
          readValue((skill as any)?.spCost, readValue(data?.spCost, 0)),
        ),
      };
    }

    const item = player.getItem(entry.id);
    const data = (player as any).databaseById?.(entry.id) ?? item;
    const quantity = Number(readValue((item as any)?.quantity, 0));
    const type = readValue(data?._type, "item");
    const consumable = readValue(data?.consumable, type === "item");
    return {
      index,
      type: "item",
      entry,
      id: entry.id,
      name: readValue((item as any)?.name, readValue(data?.name, entry.id)),
      description: readValue(
        (item as any)?.description,
        readValue(data?.description, ""),
      ),
      icon: readValue(data?.icon, readValue((item as any)?.icon)),
      quantity,
      usable: Boolean(item) && type === "item" && consumable !== false && quantity > 0,
    };
  });

  while (slots.length < HOTBAR_SLOT_COUNT) {
    slots.push({
      index: slots.length,
      type: "empty",
      entry: null,
      usable: false,
    } as any);
  }
  return { hotbar, slots };
};

export class HotbarGui extends Gui {
  private options: HotbarGuiOptions = {};

  constructor(player: RpgPlayer) {
    super(PrebuiltGui.Hotbar, player);
  }

  refresh(clientActionId?: string): void {
    this.update(buildPlayerHotbarData(this.player), { clientActionId });
  }

  open(options: HotbarGuiOptions = {}): Promise<unknown | null> {
    this.options = options;
    if (options.autoInitialize !== false) {
      this.player.initializeHotbar();
    }

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
      if (!entry) {
        this.refresh(clientActionId);
        return;
      }
      try {
        if (this.options.onUse) {
          await this.options.onUse(this.player, { slot, entry, target });
        } else {
          this.player.useHotbarSlot(slot, target as any);
        }
      } finally {
        this.refresh(clientActionId);
      }
    });
    this.on("refresh", () => this.refresh());

    return super.open(buildPlayerHotbarData(this.player));
  }
}
