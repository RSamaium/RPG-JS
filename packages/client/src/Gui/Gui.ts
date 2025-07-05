import { Context, inject } from "@signe/di";
import { signal, Signal, WritableSignal } from "canvasengine";
import { AbstractWebsocket, WebSocketToken } from "../services/AbstractSocket";
import { DialogboxComponent } from "../components/gui";
import { combineLatest, Subscription } from "rxjs";

interface GuiOptions {
  name?: string;
  id?: string;
  component: any;
  display?: boolean;
  data?: any;
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
  dependencies?: () => Signal[];
}

interface GuiInstance {
  name: string;
  component: any;
  display: WritableSignal<boolean>;
  data: WritableSignal<any>;
  autoDisplay: boolean;
  dependencies?: () => Signal[];
  subscription?: Subscription;
}

const throwError = (id: string) => {
  throw `The GUI named ${id} is non-existent. Please add the component in the gui property of the decorator @RpgClient`;
};

export class RpgGui {
  private webSocket: AbstractWebsocket;
  gui = signal<Record<string, GuiInstance>>({});
  extraGuis: GuiInstance[] = [];
  private vueGuiInstance: any = null; // Reference to VueGui instance

  constructor(private context: Context) {
    this.webSocket = inject(context, WebSocketToken);
    this.add({
      name: "rpg-dialog",
      component: DialogboxComponent,
    });
  }

  async _initialize() {
    this.webSocket.on("gui.open", (data: { guiId: string; data: any }) => {
      this.display(data.guiId, data.data);
    });

    this.webSocket.on("gui.exit", (guiId: string) => {
      this.hide(guiId);
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
    if (this.vueGuiInstance && this.vueGuiInstance.vm) {
      // Find the GUI in extraGuis
      const extraGui = this.extraGuis.find(gui => gui.name === guiId);
      if (extraGui) {
        // Update the Vue component's display state and data
        this.vueGuiInstance.vm.gui[guiId] = {
          name: guiId,
          display,
          data,
          attachToSprite: false // Default value, could be configurable
        };
        // Trigger Vue reactivity
        this.vueGuiInstance.vm.gui = Object.assign({}, this.vueGuiInstance.vm.gui);
      }
    }
  }

  /**
   * Initialize Vue components in the VueGui instance
   * This should be called after VueGui is mounted
   */
  _initializeVueComponents() {
    if (this.vueGuiInstance && this.vueGuiInstance.vm) {
      // Initialize all extraGuis in the Vue instance
      this.extraGuis.forEach(gui => {
        this.vueGuiInstance.vm.gui[gui.name] = {
          name: gui.name,
          display: gui.display(),
          data: gui.data(),
          attachToSprite: false
        };
      });
      
      // Trigger Vue reactivity
      this.vueGuiInstance.vm.gui = Object.assign({}, this.vueGuiInstance.vm.gui);
    }
  }

  guiInteraction(guiId: string, name: string, data: any) {
    this.webSocket.emit("gui.interaction", {
      guiId,
      name,
      data,
    });
  }

  guiClose(guiId: string, data?: any) {
    this.webSocket.emit("gui.exit", {
      guiId,
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
   * 
   * @example
   * ```ts
   * gui.add({
   *   name: 'inventory',
   *   component: InventoryComponent, // Must be a .ce component
   *   autoDisplay: true,
   *   dependencies: () => [playerSignal, inventorySignal]
   * });
   * ```
   */
  add(gui: GuiOptions) {
    const guiId = gui.name || gui.id;
    if (!guiId) {
      throw new Error("GUI must have a name or id");
    }

    const guiInstance: GuiInstance = {
      name: guiId,
      component: gui.component,
      display: signal(gui.display || false),
      data: signal(gui.data || {}),
      autoDisplay: gui.autoDisplay || false,
      dependencies: gui.dependencies,
    };

    // Accept both CanvasEngine components (.ce) and Vue components
    // Vue components will be handled by VueGui if available
    if (typeof gui.component !== 'function') {
      this.extraGuis.push(guiInstance);
      
      // Auto display Vue components if enabled
      if (guiInstance.autoDisplay) {
        this._notifyVueGui(guiId, true, gui.data || {});
      }
      return;
    }

    this.gui()[guiId] = guiInstance;

    // Auto display if enabled and it's a CanvasEngine component
    if (guiInstance.autoDisplay && typeof gui.component === 'function') {
      this.display(guiId);
    }
  }

  get(id: string): GuiInstance | undefined {
    // Check CanvasEngine GUIs first
    const canvasGui = this.gui()[id];
    if (canvasGui) {
      return canvasGui;
    }
    
    // Check Vue GUIs in extraGuis
    return this.extraGuis.find(gui => gui.name === id);
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
  display(id: string, data = {}, dependencies: Signal[] = []) {
    if (!this.exists(id)) {
      throw throwError(id);
    }

    const guiInstance = this.get(id)!;
    
    // Check if it's a Vue component (in extraGuis)
    const isVueComponent = this.extraGuis.some(gui => gui.name === id);
    
    if (isVueComponent) {
      // Handle Vue component display
      this._handleVueComponentDisplay(id, data, dependencies, guiInstance);
    } else {
      // Handle CanvasEngine component display
      this._handleCanvasComponentDisplay(id, data, dependencies, guiInstance);
    }
  }

  /**
   * Handle Vue component display logic
   * 
   * @param id - GUI component ID
   * @param data - Component data
   * @param dependencies - Runtime dependencies
   * @param guiInstance - GUI instance
   */
  private _handleVueComponentDisplay(id: string, data: any, dependencies: Signal[], guiInstance: GuiInstance) {
    // Unsubscribe from previous subscription if exists
    if (guiInstance.subscription) {
      guiInstance.subscription.unsubscribe();
      guiInstance.subscription = undefined;
    }

    // Use runtime dependencies or config dependencies
    const deps = dependencies.length > 0 
      ? dependencies 
      : (guiInstance.dependencies ? guiInstance.dependencies() : []);

    if (deps.length > 0) {
      // Subscribe to dependencies
      guiInstance.subscription = combineLatest(
        deps.map(dependency => dependency.observable)
      ).subscribe((values) => {
        if (values.every(value => value !== undefined)) {
          guiInstance.data.set(data);
          guiInstance.display.set(true);
          this._notifyVueGui(id, true, data);
        }
      });
      return;
    }

    // No dependencies, display immediately
    guiInstance.data.set(data);
    guiInstance.display.set(true);
    this._notifyVueGui(id, true, data);
  }

  /**
   * Handle CanvasEngine component display logic
   * 
   * @param id - GUI component ID
   * @param data - Component data
   * @param dependencies - Runtime dependencies
   * @param guiInstance - GUI instance
   */
  private _handleCanvasComponentDisplay(id: string, data: any, dependencies: Signal[], guiInstance: GuiInstance) {
    // Unsubscribe from previous subscription if exists
    if (guiInstance.subscription) {
      guiInstance.subscription.unsubscribe();
      guiInstance.subscription = undefined;
    }

    // Use runtime dependencies or config dependencies
    const deps = dependencies.length > 0 
      ? dependencies 
      : (guiInstance.dependencies ? guiInstance.dependencies() : []);

    if (deps.length > 0) {
      // Subscribe to dependencies
      guiInstance.subscription = combineLatest(
        deps.map(dependency => dependency.observable)
      ).subscribe((values) => {
        if (values.every(value => value !== undefined)) {
          guiInstance.data.set(data);
          guiInstance.display.set(true);
        }
      });
      return;
    }

    // No dependencies, display immediately
    guiInstance.data.set(data);
    guiInstance.display.set(true);
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

    guiInstance.display.set(false);
    
    // Check if it's a Vue component and notify VueGui
    const isVueComponent = this.extraGuis.some(gui => gui.name === id);
    if (isVueComponent) {
      this._notifyVueGui(id, false);
    }
  }
}
