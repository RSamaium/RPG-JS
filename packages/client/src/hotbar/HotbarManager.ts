import { Context, inject as diInject } from "@signe/di";
import { computed, signal } from "canvasengine";
import type { RpgActionInput } from "@rpgjs/common";
import { RpgClientEngine } from "../RpgClientEngine";
import { RpgGui } from "../Gui/Gui";
import { HotbarEntrySourceToken, HotbarGui, HotbarOptionsToken } from "./tokens";
import { loadHotbarRefs, saveHotbarRefs } from "./storage";
import { normalizeRefs, resolveHotbarOptions } from "./options";
import type {
  HotbarAction,
  HotbarAssignGuiData,
  HotbarEntry,
  HotbarEntrySource,
  HotbarGuiData,
  HotbarRef,
  HotbarSlot,
  HotbarTriggerContext,
  ResolvedHotbarOptions,
} from "./types";

interface HotbarState {
  refs: Array<HotbarRef | null>;
  selectedSlot: number;
  assignEntry: HotbarEntry | null;
}

export class HotbarManager {
  options: ResolvedHotbarOptions = resolveHotbarOptions();
  private sources: HotbarEntrySource[] = [];
  private client?: RpgClientEngine;
  private gui?: RpgGui;

  readonly state = signal<HotbarState>({
    refs: [],
    selectedSlot: -1,
    assignEntry: null,
  });

  readonly slots = computed<HotbarSlot[]>(() => this.resolveSlots());
  readonly data = computed<HotbarGuiData>(() => ({
    slots: this.slots(),
    refs: this.state().refs,
    bindings: this.options.bindings,
    selectedSlot: this.state().selectedSlot,
    options: this.options,
  }));
  readonly assignData = computed<HotbarAssignGuiData>(() => ({
    entry: this.state().assignEntry,
    slots: this.slots(),
    bindings: this.options.bindings,
    options: this.options,
  }));

  constructor(
    private context?: Context,
    options?: ResolvedHotbarOptions,
    sources?: HotbarEntrySource[],
  ) {
    this.options = options ?? this.injectOptions();
    this.sources = sources ?? this.injectSources();
    this.state.set({
      refs: this.initialRefs(),
      selectedSlot: -1,
      assignEntry: null,
    });
  }

  setSources(sources: HotbarEntrySource[]) {
    this.sources = sources;
  }

  getEntries(): HotbarEntry[] {
    const context = {
      client: this.getClient(true),
      manager: this,
    };
    return this.sources.flatMap((source) => {
      try {
        return source.resolve(context) ?? [];
      } catch (error) {
        console.warn(`[RPGJS] Hotbar entry source "${source.id}" failed`, error);
        return [];
      }
    });
  }

  assign(slotIndex: number, ref: HotbarRef | null): boolean {
    if (!this.isValidSlotIndex(slotIndex)) return false;
    const refs = this.state().refs.slice();
    refs[slotIndex] = ref ? { type: ref.type, id: ref.id } : null;
    this.setRefs(refs);
    return true;
  }

  assignEntry(slotIndex: number, entry: HotbarEntry): boolean {
    return this.assign(slotIndex, entry.ref);
  }

  assignFirstAvailable(entry: HotbarEntry): number {
    const refs = this.state().refs;
    const freeIndex = refs.findIndex((ref) => ref === null);
    const slotIndex = freeIndex >= 0 ? freeIndex : 0;
    this.assign(slotIndex, entry.ref);
    return slotIndex;
  }

  clear(slotIndex: number): boolean {
    return this.assign(slotIndex, null);
  }

  move(fromIndex: number, toIndex: number): boolean {
    if (!this.isValidSlotIndex(fromIndex) || !this.isValidSlotIndex(toIndex)) return false;
    const refs = this.state().refs.slice();
    const current = refs[fromIndex];
    refs[fromIndex] = refs[toIndex];
    refs[toIndex] = current;
    this.setRefs(refs);
    return true;
  }

  setRefs(refs: Array<HotbarRef | null>) {
    const normalizedRefs = normalizeRefs(refs, this.options.slots);
    this.state.set({
      ...this.state(),
      refs: normalizedRefs,
    });
    this.persist(normalizedRefs);
  }

  select(slotIndex: number) {
    if (!this.isValidSlotIndex(slotIndex)) return;
    this.state.set({
      ...this.state(),
      selectedSlot: slotIndex,
    });
  }

  async trigger(slotIndex: number): Promise<boolean> {
    if (!this.isValidSlotIndex(slotIndex)) return false;
    const slot = this.slots()[slotIndex];
    if (!slot || slot.empty || slot.disabled || !slot.entry || !slot.ref) return false;
    this.select(slotIndex);

    const action = slot.entry.action;
    if (!action || action.type === "none") return false;

    const context: HotbarTriggerContext = {
      client: this.getClient(),
      manager: this,
      entry: slot.entry,
      ref: slot.ref,
      slotIndex,
    };

    if (action.type === "callback") {
      const result = await action.run(context);
      return result !== false;
    }

    this.triggerInput(action, context);
    return true;
  }

  openAssignMenu(entry: HotbarEntry): boolean {
    this.state.set({
      ...this.state(),
      assignEntry: entry,
    });

    const gui = this.getGui(true);
    if (!gui?.exists(HotbarGui.AssignMenu)) return false;
    gui.display(HotbarGui.AssignMenu, this.assignData());
    return true;
  }

  closeAssignMenu() {
    this.state.set({
      ...this.state(),
      assignEntry: null,
    });

    const gui = this.getGui(true);
    if (gui?.exists(HotbarGui.AssignMenu) && gui.isDisplaying(HotbarGui.AssignMenu)) {
      gui.hide(HotbarGui.AssignMenu);
    }
  }

  installGui(gui: RpgGui, component: any, assignComponent: any) {
    this.gui = gui;
    if (!this.options.enabled) return;
    gui.add({
      id: HotbarGui.Hotbar,
      component,
      autoDisplay: this.options.autoDisplay,
      data: this.data(),
    });
    gui.add({
      id: HotbarGui.AssignMenu,
      component: assignComponent,
      autoDisplay: false,
      data: this.assignData(),
    });
  }

  private resolveSlots(): HotbarSlot[] {
    const entries = this.getEntries();
    const byRef = new Map(entries.map((entry) => [this.refKey(entry.ref), entry]));
    return this.state().refs.map((ref, index) => {
      const entry = ref ? byRef.get(this.refKey(ref)) ?? null : null;
      const missing = Boolean(ref && !entry);
      return {
        index,
        binding: this.options.bindings[index] ?? String(index + 1),
        ref,
        entry: entry ?? (missing ? this.missingEntry(ref!) : null),
        empty: !ref,
        disabled: missing || Boolean(entry?.disabled),
        missing,
      };
    });
  }

  private missingEntry(ref: HotbarRef): HotbarEntry {
    return {
      ref,
      label: `${ref.type}:${ref.id}`,
      disabled: true,
      rarity: "common",
    };
  }

  private triggerInput(action: Extract<HotbarAction, { type: "input" }>, context: HotbarTriggerContext) {
    const input = typeof action.input === "function"
      ? action.input(context)
      : action.input;
    if (input === undefined || input === null) return;

    const data = typeof action.data === "function"
      ? action.data(context)
      : action.data;
    const client = context.client;

    if (typeof input !== "object") {
      data === undefined ? client.processAction(input) : client.processAction(input, data);
      return;
    }

    if (data === undefined) {
      client.processAction(input);
      return;
    }

    client.processAction({
      ...(input as RpgActionInput),
      data,
    });
  }

  private initialRefs(): Array<HotbarRef | null> {
    if (this.options.storageKey) {
      const storedRefs = loadHotbarRefs(this.options.storageKey);
      if (storedRefs) {
        return normalizeRefs(storedRefs, this.options.slots);
      }
    }
    return normalizeRefs(this.options.initialRefs, this.options.slots);
  }

  private persist(refs: Array<HotbarRef | null>) {
    if (!this.options.storageKey) return;
    saveHotbarRefs(this.options.storageKey, refs);
  }

  private injectOptions(): ResolvedHotbarOptions {
    if (!this.context) return resolveHotbarOptions();
    return diInject<ResolvedHotbarOptions>(this.context, HotbarOptionsToken, { optional: true })
      ?? resolveHotbarOptions();
  }

  private injectSources(): HotbarEntrySource[] {
    if (!this.context) return [];
    return diInject<HotbarEntrySource>(this.context, HotbarEntrySourceToken, {
      optional: true,
      multi: true,
    });
  }

  getClient(optional?: false): RpgClientEngine;
  getClient(optional: true): RpgClientEngine | undefined;
  getClient(optional = false): RpgClientEngine | undefined {
    if (this.client) return this.client;
    if (!this.context) {
      if (optional) return undefined;
      throw new Error("HotbarManager needs an RPGJS client context to trigger entries.");
    }
    this.client = diInject<RpgClientEngine>(this.context, RpgClientEngine, { optional: true });
    if (!this.client && !optional) {
      throw new Error("HotbarManager could not resolve RpgClientEngine.");
    }
    return this.client;
  }

  getGui(optional?: false): RpgGui;
  getGui(optional: true): RpgGui | undefined;
  getGui(optional = false): RpgGui | undefined {
    if (this.gui) return this.gui;
    if (!this.context) {
      if (optional) return undefined;
      throw new Error("HotbarManager needs an RPGJS client context to open GUI.");
    }
    this.gui = diInject<RpgGui>(this.context, RpgGui, { optional: true });
    if (!this.gui && !optional) {
      throw new Error("HotbarManager could not resolve RpgGui.");
    }
    return this.gui;
  }

  private isValidSlotIndex(slotIndex: number): boolean {
    return Number.isInteger(slotIndex) && slotIndex >= 0 && slotIndex < this.options.slots;
  }

  private refKey(ref: HotbarRef): string {
    return `${ref.type}:${ref.id}`;
  }
}
