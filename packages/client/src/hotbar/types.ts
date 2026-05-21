import type { RpgActionInput, RpgActionName } from "@rpgjs/common";
import type { RpgClientEngine } from "../RpgClientEngine";
import type { HotbarManager } from "./HotbarManager";

export type HotbarEntryType = string;

export interface HotbarRef {
  type: HotbarEntryType;
  id: string;
}

export type HotbarRarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | string;

export interface HotbarTriggerContext<TClient = RpgClientEngine> {
  client: TClient;
  manager: HotbarManager;
  entry: HotbarEntry;
  ref: HotbarRef;
  slotIndex: number;
}

export type HotbarInputResolver<TClient = RpgClientEngine> = (
  context: HotbarTriggerContext<TClient>,
) => RpgActionInput | RpgActionName | undefined;

export type HotbarActionDataResolver<TClient = RpgClientEngine> = (
  context: HotbarTriggerContext<TClient>,
) => any;

export type HotbarCallback<TClient = RpgClientEngine> = (
  context: HotbarTriggerContext<TClient>,
) => void | boolean | Promise<void | boolean>;

export type HotbarAction<TClient = RpgClientEngine> =
  | {
      type: "input";
      input: RpgActionName | RpgActionInput | HotbarInputResolver<TClient>;
      data?: any | HotbarActionDataResolver<TClient>;
    }
  | {
      type: "callback";
      run: HotbarCallback<TClient>;
    }
  | {
      type: "none";
    };

export interface HotbarEntry<TClient = RpgClientEngine> {
  ref: HotbarRef;
  label: string;
  description?: string;
  icon?: string | { id: string; playing?: string };
  quantity?: number | string;
  rarity?: HotbarRarity;
  disabled?: boolean;
  cooldown?: number;
  action?: HotbarAction<TClient>;
}

export interface HotbarEntryResolverContext<TClient = RpgClientEngine> {
  client?: TClient;
  manager: HotbarManager;
}

export type HotbarEntryResolver<TClient = RpgClientEngine> = (
  context: HotbarEntryResolverContext<TClient>,
) => HotbarEntry<TClient>[];

export interface HotbarEntrySource<TClient = RpgClientEngine> {
  id: string;
  resolve: HotbarEntryResolver<TClient>;
}

export interface HotbarSlot {
  index: number;
  binding: string;
  ref: HotbarRef | null;
  entry: HotbarEntry | null;
  empty: boolean;
  disabled: boolean;
  missing: boolean;
}

export interface HotbarGuiData {
  slots: HotbarSlot[];
  refs: Array<HotbarRef | null>;
  bindings: string[];
  selectedSlot: number;
  options: ResolvedHotbarOptions;
}

export interface HotbarAssignGuiData {
  entry: HotbarEntry | null;
  slots: HotbarSlot[];
  bindings: string[];
  options: ResolvedHotbarOptions;
}

export interface HotbarOptions {
  enabled?: boolean;
  slots?: number;
  bindings?: string[];
  storageKey?: string | false;
  initialRefs?: Array<HotbarRef | null>;
  autoDisplay?: boolean;
  component?: any;
  assignComponent?: any;
  position?: "bottom" | "top" | "left" | "right" | "custom";
  className?: string;
}

export interface ResolvedHotbarOptions {
  enabled: boolean;
  slots: number;
  bindings: string[];
  storageKey: string | false;
  initialRefs: Array<HotbarRef | null>;
  autoDisplay: boolean;
  component?: any;
  assignComponent?: any;
  position: "bottom" | "top" | "left" | "right" | "custom";
  className: string;
}
