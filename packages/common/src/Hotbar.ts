export const HOTBAR_SLOT_COUNT = 10;

export type HotbarEntryType = "skill" | "item";

export interface HotbarEntry {
  type: HotbarEntryType;
  id: string;
}

export type HotbarSlot = HotbarEntry | null;

export interface HotbarState {
  version: 1;
  initialized: boolean;
  slots: HotbarSlot[];
}

export const createHotbarState = (): HotbarState => ({
  version: 1,
  initialized: false,
  slots: Array.from({ length: HOTBAR_SLOT_COUNT }, () => null),
});
