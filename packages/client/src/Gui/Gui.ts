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

    // Only accept CanvasEngine components (.ce) - functions
    // Vue components should be handled by @rpgjs/vue package
    if (typeof gui.component !== 'function') {
      console.warn(`GUI component "${guiId}" is not a CanvasEngine component (.ce). Use @rpgjs/vue package for Vue components.`);
      return;
    }

    const guiInstance: GuiInstance = {
      name: guiId,
      component: gui.component,
      display: signal(gui.display || false),
      data: signal(gui.data || {}),
      autoDisplay: gui.autoDisplay || false,
      dependencies: gui.dependencies,
    };

    this.gui()[guiId] = guiInstance;

    // Auto display if enabled
    if (guiInstance.autoDisplay) {
      this.display(guiId);
    }
  }

  get(id: string): GuiInstance | undefined {
    return this.gui()[id];
  }

  exists(id: string): boolean {
    return !!this.get(id);
  }

  getAll(): Record<string, GuiInstance> {
    return this.gui();
  }

  /**
   * Display a GUI component
   * 
   * Displays the GUI immediately if no dependencies are configured,
   * or waits for all dependencies to be resolved if dependencies are present.
   * Automatically manages subscriptions to prevent memory leaks.
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
  }
}
