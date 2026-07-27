import { Context, inject } from "@signe/di";
import { signal, Signal, WritableSignal, type ComponentFunction } from "canvasengine";
import { AbstractWebsocket, WebSocketToken } from "../services/AbstractSocket";
import { DialogboxComponent, ShopComponent, SaveLoadComponent, MainMenuComponent, NotificationComponent, TitleScreenComponent, GameoverComponent, InputComponent, HotbarComponent } from "../components/gui";
import { combineLatest, Subscription } from "rxjs";
import { PrebuiltGui, type RpgContext } from "@rpgjs/common";

export type GuiRenderer = "canvas" | "vue";

export type GuiComponent = ComponentFunction | object;

export interface GuiRegistration<
  TData = unknown,
  TComponent extends GuiComponent = GuiComponent,
> {
  name?: string;
  id?: string;
  component: TComponent;
  /**
   * Renderer responsible for this component. CanvasEngine is the v5 default.
   * `@rpgjs/vue` registers the official DOM overlay renderer.
   */
  renderer?: GuiRenderer;
  display?: boolean;
  data?: TData;
  /**
   * Auto display the GUI when added to the system
   * @default false
   */
  autoDisplay?: boolean;
  /**
   * Function that returns an array of Signal dependencies
   * The GUI will only display when all dependencies are resolved (!= undefined)
   * @returns Array of Signal dependencies
   */
  dependencies?: () => Signal<unknown>[];
  /**
   * Attach the GUI to sprites instead of displaying globally
   * When true, the GUI will be rendered in character.ce for each sprite
   * @default false
   */
  attachToSprite?: boolean;
  /**
   * Vue v4 compatibility flag. Prefer attachToSprite in v5 projects.
   */
  rpgAttachToSprite?: boolean;
}

export type GuiEntry<TData = unknown> =
  | GuiRegistration<TData>
  | GuiComponent;

export interface GuiInstance<
  TData = unknown,
  TComponent extends GuiComponent = GuiComponent,
> {
  name: string;
  component: TComponent;
  renderer: GuiRenderer;
  display: WritableSignal<boolean>;
  data: WritableSignal<TData>;
  openId?: string;
  autoDisplay: boolean;
  dependencies?: Signal<unknown>[];
  subscription?: Subscription;
  attachToSprite?: boolean;
}

export type GuiRenderState<
  TData = unknown,
  TComponent extends GuiComponent = GuiComponent,
> = {
  name: string;
  component: TComponent;
  renderer: GuiRenderer;
  display: boolean;
  data: TData;
  openId?: string;
  attachToSprite: boolean;
};

type VueGuiBridge = {
  updateGuiState?: (state: GuiRenderState) => void;
  initializeGuiStates?: (states: GuiRenderState[]) => void;
};

interface GuiAction {
  guiId: string;
  name: string;
  data: any;
  clientActionId: string;
}

type OptimisticReducer = (data: any, action: GuiAction) => any;

const throwError = (id: string) => {
  throw `The GUI named ${id} is non-existent. Please add the component in the gui property of the decorator @RpgClient`;
};

const updateItemQuantity = (items: any[], id: string) => {
  const index = items.findIndex((item) => item?.id === id);
  if (index === -1) return items;
  const item = items[index];
  if (item?.usable === false) return items;
  if (item?.consumable === false) return items;
  const quantity = typeof item?.quantity === "number" ? item.quantity : 1;
  const nextQuantity = Math.max(0, quantity - 1);
  if (nextQuantity === quantity) return items;
  if (nextQuantity <= 0) {
    return items.filter((_, idx) => idx !== index);
  }
  const nextItems = items.slice();
  nextItems[index] = { ...item, quantity: nextQuantity };
  return nextItems;
};

const updateEquippedFlag = (items: any[], id: string, equip: boolean) => {
  const index = items.findIndex((item) => item?.id === id);
  if (index === -1) return items;
  const item = items[index];
  if (item?.equipped === equip) return items;
  const nextItems = items.slice();
  nextItems[index] = { ...item, equipped: equip };
  return nextItems;
};

const mainMenuOptimisticReducer: OptimisticReducer = (data, action) => {
  if (!data || typeof data !== "object") return data;
  if (
    action.name === "assignHotbarSlot" ||
    action.name === "clearHotbarSlot"
  ) {
    const slot = Number(action.data?.slot);
    if (!Number.isInteger(slot) || slot < 0 || slot >= 10 || !data.hotbar) {
      return data;
    }
    const stateSlots = Array.from(
      { length: 10 },
      (_, index) => data.hotbar.hotbar?.slots?.[index] ?? null,
    );
    const displaySlots = Array.from(
      { length: 10 },
      (_, index) => data.hotbar.slots?.[index] ?? {
        index,
        type: "empty",
        entry: null,
        usable: false,
      },
    );

    if (action.name === "clearHotbarSlot") {
      stateSlots[slot] = null;
      displaySlots[slot] = {
        index: slot,
        type: "empty",
        entry: null,
        usable: false,
      };
    } else {
      const entry = action.data?.entry;
      if (!entry?.id || (entry.type !== "skill" && entry.type !== "item")) {
        return data;
      }
      const source = entry.type === "skill"
        ? data.skills?.find((candidate: any) => candidate?.id === entry.id)
        : data.items?.find((candidate: any) => candidate?.id === entry.id);
      for (let index = 0; index < 10; index++) {
        const current = stateSlots[index];
        if (current?.type === entry.type && current.id === entry.id) {
          stateSlots[index] = null;
          displaySlots[index] = {
            index,
            type: "empty",
            entry: null,
            usable: false,
          };
        }
      }
      stateSlots[slot] = { type: entry.type, id: entry.id };
      displaySlots[slot] = {
        index: slot,
        type: entry.type,
        entry: { type: entry.type, id: entry.id },
        id: entry.id,
        name: source?.name ?? entry.id,
        icon: source?.icon,
        quantity: source?.quantity,
        usable: source?.usable !== false,
      };
    }

    return {
      ...data,
      hotbar: {
        ...data.hotbar,
        hotbar: {
          ...(data.hotbar.hotbar ?? {}),
          initialized: true,
          slots: stateSlots,
        },
        slots: displaySlots,
      },
    };
  }
  if (action.name === "useItem") {
    if (!Array.isArray(data.items)) return data;
    const id = action.data?.id;
    if (!id) return data;
    const nextItems = updateItemQuantity(data.items, id);
    if (nextItems === data.items) return data;
    return { ...data, items: nextItems };
  }
  if (action.name === "equipItem") {
    const id = action.data?.id;
    if (!id || typeof action.data?.equip !== "boolean") return data;
    const equip = action.data.equip;
    let nextItems = data.items;
    let nextEquips = data.equips;
    if (Array.isArray(data.items)) {
      nextItems = updateEquippedFlag(data.items, id, equip);
    }
    if (Array.isArray(data.equips)) {
      nextEquips = updateEquippedFlag(data.equips, id, equip);
    }
    if (nextItems === data.items && nextEquips === data.equips) return data;
    return {
      ...data,
      ...(nextItems !== data.items ? { items: nextItems } : {}),
      ...(nextEquips !== data.equips ? { equips: nextEquips } : {})
    };
  }
  return data;
};

export class RpgGui {
  private webSocket: AbstractWebsocket;
  gui = signal<Record<string, GuiInstance>>({});
  extraGuis: GuiInstance[] = [];
  private vueGuiInstance: VueGuiBridge | null = null;
  private optimisticReducers = new Map<string, OptimisticReducer[]>();
  private pendingActions = new Map<string, GuiAction[]>();
  /**
   * Signal tracking which player IDs should display attached GUIs
   * Key: player ID, Value: boolean (true = show, false = hide)
   */
  attachedGuiDisplayState = signal<Record<string, boolean>>({});

  constructor(private context: RpgContext) {
    this.webSocket = inject(context as Context, WebSocketToken);
    this.add({
      name: "rpg-dialog",
      component: DialogboxComponent,
      renderer: "canvas",
    });
    this.add({
      name: PrebuiltGui.MainMenu,
      component: MainMenuComponent,
      renderer: "canvas",
    });
    this.add({
      name: PrebuiltGui.Shop,
      component: ShopComponent,
      renderer: "canvas",
    });
    this.add({
      name: PrebuiltGui.Notification,
      component: NotificationComponent,
      renderer: "canvas",
      autoDisplay: true,
    });
    this.add({
      name: PrebuiltGui.Save,
      component: SaveLoadComponent,
      renderer: "canvas",
    });
    this.add({
      name: PrebuiltGui.TitleScreen,
      component: TitleScreenComponent,
      renderer: "canvas",
    });
    this.add({
      name: PrebuiltGui.Gameover,
      component: GameoverComponent,
      renderer: "canvas",
    });
    this.add({
      name: PrebuiltGui.Input,
      component: InputComponent,
      renderer: "canvas",
    });
    this.add({
      name: PrebuiltGui.Hotbar,
      component: HotbarComponent,
      renderer: "canvas",
    });

    this.registerOptimisticReducer(PrebuiltGui.MainMenu, mainMenuOptimisticReducer);
  }

  async _initialize() {
    this.webSocket.on("gui.open", (data: { guiId: string; data: any; guiOpenId?: string }) => {
      this.clearPendingActions(data.guiId);
      this.display(data.guiId, data.data, [], data.guiOpenId);
    });

    this.webSocket.on("gui.exit", (payload: string | { guiId: string; guiOpenId?: string }) => {
      const guiId = typeof payload === "string" ? payload : payload.guiId;
      const guiOpenId = typeof payload === "string" ? undefined : payload.guiOpenId;
      const current = this.get(guiId);
      if (guiOpenId && current?.openId && current.openId !== guiOpenId) {
        return;
      }
      this.hide(guiId);
    });

    this.webSocket.on("gui.update", (payload: { guiId: string; data: any; clientActionId?: string }) => {
      this.applyServerUpdate(payload.guiId, payload.data, payload.clientActionId);
    });

    /**
     * Listen for tooltip display state changes from server
     * This is triggered by showAttachedGui/hideAttachedGui on the server
     */
    this.webSocket.on("gui.tooltip", (data: { players: string[]; display: boolean }) => {
      const currentState = { ...this.attachedGuiDisplayState() };
      data.players.forEach((playerId) => {
        currentState[playerId] = data.display;
      });
      this.attachedGuiDisplayState.set(currentState);
    });
  }

  /**
   * Set the VueGui instance reference for Vue component management
   * This is called by VueGui when it's initialized
   * 
   * @param vueGuiInstance - The VueGui instance
   */
  _setVueGuiInstance(vueGuiInstance: any) {
    this.vueGuiInstance = vueGuiInstance;
    this._initializeVueComponents();
  }

  /**
   * Notify VueGui about GUI state changes
   * This synchronizes the Vue component display state
   * 
   * @param guiId - The GUI component ID
   * @param display - Display state
   * @param data - Component data
   */
  private _notifyVueGui(guiId: string, display: boolean, data: any = {}) {
    const extraGui = this.extraGuis.find(gui => gui.name === guiId);
    if (!extraGui) return;
    this.vueGuiInstance?.updateGuiState?.(this.toGuiState(extraGui, display, data));
  }

  /**
   * Initialize Vue components in the VueGui instance
   * This should be called after VueGui is mounted
   */
  _initializeVueComponents() {
    this.vueGuiInstance?.initializeGuiStates?.(
      this.extraGuis.map(gui => this.toGuiState(gui))
    );
  }

  guiInteraction(guiId: string, name: string, data: any) {
    const clientActionId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    const actionData = { ...(data || {}), clientActionId };
    this.applyOptimisticAction({
      guiId,
      name,
      data: actionData,
      clientActionId
    });
    this.webSocket.emit("gui.interaction", {
      guiId,
      name,
      data: actionData,
    });
  }

  guiClose(guiId: string, data?: any, guiOpenId?: unknown) {
    const normalizedOpenId =
      typeof guiOpenId === "string" && guiOpenId.length > 0 ? guiOpenId : undefined;
    this.webSocket.emit("gui.exit", {
      guiId,
      guiOpenId: normalizedOpenId,
      data,
    });
  }

  /**
   * Add a GUI component to the system
   * 
   * By default, only CanvasEngine components (.ce files) are accepted.
   * Vue components should be handled by the @rpgjs/vue package.
   * 
   * @param gui - GUI configuration options
   * @param gui.name - Name or ID of the GUI component
   * @param gui.id - Alternative ID if name is not provided
   * @param gui.component - The component to render (must be a CanvasEngine component)
   * @param gui.display - Initial display state (default: false)
   * @param gui.data - Initial data for the component
   * @param gui.autoDisplay - Auto display when added (default: false)
   * @param gui.dependencies - Function returning Signal dependencies
   * @param gui.attachToSprite - Attach GUI to sprites instead of global display (default: false)
   * 
   * @example
   * ```ts
   * gui.add({
   *   name: 'inventory',
   *   component: InventoryComponent, // Must be a .ce component
   *   autoDisplay: true,
   *   dependencies: () => [playerSignal, inventorySignal]
   * });
   * 
   * // Attach to sprites
   * gui.add({
   *   name: 'tooltip',
   *   component: TooltipComponent,
   *   attachToSprite: true
   * });
   * ```
   */
  add(gui: GuiEntry) {
    const registration = this.resolveRegistration(gui);
    const component = registration.component;
    const guiId = registration.name || registration.id || this.resolveComponentName(component);
    if (!guiId) {
      throw new Error("GUI must have a name or id");
    }
    const attachToSprite = this.resolveAttachToSprite(registration, component);
    const renderer = registration.renderer ?? this.resolveLegacyRenderer(component);
    const guiInstance: GuiInstance = {
      name: guiId,
      component,
      renderer,
      display: signal<boolean>(registration.display || false),
      data: signal(registration.data ?? {}),
      openId: undefined,
      autoDisplay: registration.autoDisplay || false,
      dependencies: registration.dependencies ? registration.dependencies() : [],
      attachToSprite,
    };

    if (this.isVueComponentInstance(guiInstance)) {
      this.removeCanvasGui(guiId);
      const existingIndex = this.extraGuis.findIndex(existing => existing.name === guiId);
      if (existingIndex >= 0) {
        this.extraGuis[existingIndex].subscription?.unsubscribe();
        this.extraGuis[existingIndex] = guiInstance;
      } else {
        this.extraGuis.push(guiInstance);
      }

      this._initializeVueComponents();
      
      if (guiInstance.autoDisplay) {
        this.display(guiId, registration.data);
      } else {
        this._notifyVueGui(guiId, guiInstance.display(), guiInstance.data());
      }
      return;
    }

    this.removeVueGui(guiId);
    this.gui()[guiId] = guiInstance;
    this._initializeVueComponents();

    // Auto display if enabled and it's a CanvasEngine component
    if (guiInstance.autoDisplay && typeof component === 'function') {
      this.display(guiId, registration.data);
    }
  }

  registerOptimisticReducer(guiId: string, reducer: OptimisticReducer) {
    const existing = this.optimisticReducers.get(guiId) || [];
    this.optimisticReducers.set(guiId, existing.concat(reducer));
  }

  /**
   * Get all attached GUI components (attachToSprite: true)
   * 
   * Returns all GUI instances that are configured to be attached to sprites.
   * These GUIs should be rendered in character.ce instead of canvas.ce.
   * 
   * @returns Array of GUI instances with attachToSprite: true
   * 
   * @example
   * ```ts
   * const attachedGuis = gui.getAttachedGuis();
   * // Use in character.ce to render tooltips
   * ```
   */
  getAttachedGuis(): GuiInstance[] {
    return Object.values(this.gui()).filter(gui => gui.attachToSprite === true);
  }

  getVueGuis(): GuiInstance[] {
    return [...this.extraGuis];
  }

  getAttachedVueGuis(): GuiInstance[] {
    return this.extraGuis.filter(gui => gui.attachToSprite === true);
  }

  /**
   * Check if a player should display attached GUIs
   * 
   * @param playerId - The player ID to check
   * @returns true if attached GUIs should be displayed for this player
   */
  shouldDisplayAttachedGui(playerId: string): boolean {
    return this.attachedGuiDisplayState()[playerId] === true;
  }

  get<TData = unknown>(id: string): GuiInstance<TData> | undefined {
    // Check CanvasEngine GUIs first
    const canvasGui = this.gui()[id];
    if (canvasGui) {
      return canvasGui as GuiInstance<TData>;
    }
    
    // Check Vue GUIs in extraGuis
    return this.extraGuis.find(gui => gui.name === id) as GuiInstance<TData> | undefined;
  }

  exists(id: string): boolean {
    return !!this.get(id);
  }

  getAll(): Record<string, GuiInstance> {
    const allGuis = { ...this.gui() };
    
    // Add extraGuis to the result
    this.extraGuis.forEach(gui => {
      allGuis[gui.name] = gui;
    });
    
    return allGuis;
  }

  /**
   * Display a GUI component
   * 
   * Displays the GUI immediately if no dependencies are configured,
   * or waits for all dependencies to be resolved if dependencies are present.
   * Automatically manages subscriptions to prevent memory leaks.
   * Works with both CanvasEngine components and Vue components.
   * 
   * @param id - The GUI component ID
   * @param data - Data to pass to the component
   * @param dependencies - Optional runtime dependencies (overrides config dependencies)
   * 
   * @example
   * ```ts
   * // Display immediately
   * gui.display('inventory', { items: [] });
   * 
   * // Display with runtime dependencies
   * gui.display('shop', { shopId: 1 }, [playerSignal, shopSignal]);
   * ```
   */
  display(
    id: string,
    data: unknown = {},
    dependencies: Signal<unknown>[] = [],
    openId?: string,
  ) {
    if (!this.exists(id)) {
      throw throwError(id);
    }

    const guiInstance = this.get(id)!;
    const isVueComponent = this.extraGuis.some(gui => gui.name === id);

    if (guiInstance.subscription) {
      guiInstance.subscription.unsubscribe();
      guiInstance.subscription = undefined;
    }

    const show = () => {
      guiInstance.openId = openId;
      guiInstance.data.set(data);
      guiInstance.display.set(true);
      if (isVueComponent) {
        this._notifyVueGui(id, true, data);
      }
    };

    const deps = dependencies.length > 0
      ? dependencies
      : (guiInstance.dependencies ?? []);

    if (deps.length > 0) {
      const values = deps.map(dependency => dependency());
      const subscription = new Subscription();
      const showIfReady = () => {
        if (values.every(value => value !== undefined)) {
          show();
        }
      };

      deps.forEach((dependency, index) => {
        subscription.add(dependency.observable.subscribe((value) => {
          values[index] = value;
          showIfReady();
        }));
      });

      guiInstance.subscription = subscription;
      showIfReady();
      return;
    }

    show();
  }

  isDisplaying(id: string): boolean {
    const guiInstance = this.get(id);
    if (!guiInstance) return false;
    return guiInstance.display();
  }

  /**
   * Handle Vue component display logic
   * 
   * @param id - GUI component ID
   * @param data - Component data
   * @param dependencies - Runtime dependencies
   * @param guiInstance - GUI instance
   */
  private _handleVueComponentDisplay(id: string, data: any, dependencies: Signal[], guiInstance: GuiInstance, openId?: string) {
    // Unsubscribe from previous subscription if exists
    if (guiInstance.subscription) {
      guiInstance.subscription.unsubscribe();
      guiInstance.subscription = undefined;
    }

    // Use runtime dependencies or config dependencies
    const deps = dependencies.length > 0 
      ? dependencies 
      : (guiInstance.dependencies ?? []);

    if (deps.length > 0) {
      const values = deps.map(dependency => dependency());
      const subscription = new Subscription();
      const showIfReady = () => {
        if (values.every(value => value !== undefined)) {
          guiInstance.openId = openId;
          guiInstance.data.set(data);
          guiInstance.display.set(true);
          this._notifyVueGui(id, true, data);
        }
      };

      deps.forEach((dependency, index) => {
        subscription.add(dependency.observable.subscribe((value) => {
          values[index] = value;
          showIfReady();
        }));
      });

      guiInstance.subscription = subscription;
      showIfReady();
      return;
    }

    // No dependencies, display immediately
    guiInstance.openId = openId;
    guiInstance.data.set(data);
    guiInstance.display.set(true);
    this._notifyVueGui(id, true, data);
  }

  /**
   * Hide a GUI component
   * 
   * Hides the GUI and cleans up any active subscriptions.
   * Works with both CanvasEngine components and Vue components.
   * 
   * @param id - The GUI component ID
   * 
   * @example
   * ```ts
   * gui.hide('inventory');
   * ```
   */
  hide(id: string) {
    if (!this.exists(id)) {
      throw throwError(id);
    }

    const guiInstance = this.get(id)!;
    
    // Unsubscribe if there's an active subscription
    if (guiInstance.subscription) {
      guiInstance.subscription.unsubscribe();
      guiInstance.subscription = undefined;
    }

    guiInstance.display.set(false)
    guiInstance.openId = undefined;
    
    // Check if it's a Vue component and notify VueGui
    const isVueComponent = this.extraGuis.some(gui => gui.name === id);
    if (isVueComponent) {
      this._notifyVueGui(id, false);
    }
  }

  private isVueComponent(id: string) {
    return this.extraGuis.some(gui => gui.name === id);
  }

  private isVueComponentInstance(gui: GuiInstance) {
    return gui.renderer === "vue";
  }

  private removeCanvasGui(guiId: string) {
    const current = this.gui();
    if (!(guiId in current)) return;
    const next = { ...current };
    delete next[guiId];
    this.gui.set(next);
  }

  private removeVueGui(guiId: string) {
    const removed = this.extraGuis.filter(existing => existing.name === guiId);
    removed.forEach(gui => gui.subscription?.unsubscribe());
    if (removed.length > 0) {
      this.extraGuis = this.extraGuis.filter(existing => existing.name !== guiId);
    }
  }

  private resolveRegistration(gui: GuiEntry): GuiRegistration {
    if (
      typeof gui === "object"
      && gui !== null
      && "component" in gui
    ) {
      return gui as GuiRegistration;
    }
    return { component: gui };
  }

  private resolveComponentName(component: GuiComponent): string | undefined {
    const named = component as { name?: unknown; __name?: unknown };
    if (typeof named.name === "string" && named.name.length > 0) return named.name;
    if (typeof named.__name === "string" && named.__name.length > 0) return named.__name;
    return undefined;
  }

  private resolveLegacyRenderer(component: GuiComponent): GuiRenderer {
    return typeof component === "function" ? "canvas" : "vue";
  }

  private resolveAttachToSprite(gui: GuiRegistration, component: GuiComponent) {
    const componentOptions = component as {
      attachToSprite?: unknown;
      rpgAttachToSprite?: unknown;
    };
    return !!(
      gui.attachToSprite
      || gui.rpgAttachToSprite
      || componentOptions.attachToSprite
      || componentOptions.rpgAttachToSprite
    );
  }

  private toGuiState(gui: GuiInstance, display = gui.display(), data = gui.data()): GuiRenderState {
    return {
      name: gui.name,
      component: gui.component,
      renderer: gui.renderer,
      display,
      data,
      openId: gui.openId,
      attachToSprite: gui.attachToSprite || false,
    };
  }

  private clearPendingActions(guiId: string) {
    this.pendingActions.delete(guiId);
  }

  private applyReducers(guiId: string, data: any, actions: GuiAction[]) {
    const reducers = this.optimisticReducers.get(guiId);
    if (!reducers || reducers.length === 0) return data;
    let next = data;
    for (const action of actions) {
      for (const reducer of reducers) {
        const updated = reducer(next, action);
        if (updated !== undefined && updated !== null && updated !== next) {
          next = updated;
        }
      }
    }
    return next;
  }

  private applyOptimisticAction(action: GuiAction) {
    const guiInstance = this.get(action.guiId);
    if (!guiInstance) return;
    const reducers = this.optimisticReducers.get(action.guiId);
    if (!reducers || reducers.length === 0) return;
    const currentData = guiInstance.data();
    const nextData = this.applyReducers(action.guiId, currentData, [action]);
    if (nextData === currentData) return;
    guiInstance.data.set(nextData);
    const pending = this.pendingActions.get(action.guiId) || [];
    pending.push(action);
    this.pendingActions.set(action.guiId, pending);
    if (this.isVueComponent(action.guiId)) {
      this._notifyVueGui(action.guiId, guiInstance.display(), nextData);
    }
  }

  private applyServerUpdate(guiId: string, data: any, clientActionId?: string) {
    const guiInstance = this.get(guiId);
    if (!guiInstance) return;
    let pending = this.pendingActions.get(guiId) || [];
    if (clientActionId) {
      pending = pending.filter(action => action.clientActionId !== clientActionId);
    } else {
      pending = [];
    }
    let nextData = data;
    if (pending.length) {
      nextData = this.applyReducers(guiId, nextData, pending);
    }
    guiInstance.data.set(nextData);
    this.pendingActions.set(guiId, pending);
    if (this.isVueComponent(guiId)) {
      this._notifyVueGui(guiId, guiInstance.display(), nextData);
    }
  }
}
