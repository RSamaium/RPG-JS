export const HOTBAR_SLOT_COUNT = 10;

export type HotbarEntryType = "skill" | "item" | (string & {});

export interface HotbarEntry {
  type: HotbarEntryType;
  id: string;
}

export type HotbarSlot = HotbarEntry | null;

export type HotbarActivationMode = "instant" | "select" | "target";

export interface HotbarEntryPresentation {
  id: string;
  type: string;
  name: string;
  description?: string;
  icon?: string;
  quantity?: number;
  cost?: { value: number; label: string };
  badge?: string;
  usable: boolean;
  cooldownMs?: number;
  readyAt?: number;
  activation: {
    mode: HotbarActivationMode;
    handler?: string;
    payload?: Record<string, unknown>;
  };
}

export interface HotbarState {
  version: 2;
  initialized: boolean;
  capacity: number;
  activeSlot: number | null;
  slots: HotbarSlot[];
}

export const createHotbarState = (): HotbarState => ({
  version: 2,
  initialized: false,
  capacity: HOTBAR_SLOT_COUNT,
  activeSlot: null,
  slots: Array.from({ length: HOTBAR_SLOT_COUNT }, () => null),
});
