import { RpgPlayer } from "./Player";
import { Gui, DialogGui, MenuGui, ShopGui, NotificationGui, SaveLoadGui, GameoverGui, InputGui, HotbarGui } from "../Gui";
import type { HotbarGuiOptions } from "../Gui/HotbarGui";
import type { ShopGuiOptions, ShopItemInput } from "../Gui/ShopGui";
import { DialogOptions, DialogBaseOptions, Choice } from "../Gui/DialogGui";
import { SaveLoadOptions, SaveSlot } from "../Gui/SaveLoadGui";
import { MenuGuiOptions } from "../Gui/MenuGui";
import { GameoverGuiOptions, GameoverGuiSelection } from "../Gui/GameoverGui";
import { InputOptions, NumberInputOptions, TextInputOptions, TextareaInputOptions } from "../Gui/InputForm";
import { Constructor, PlayerCtor, PrebuiltGui } from "@rpgjs/common";

/**
 * GUI Manager Mixin
 *
 * Provides graphical user interface management capabilities to any class. This mixin handles
 * dialog boxes, menus, notifications, shops, and custom GUI components. It manages the
 * complete GUI system including opening, closing, and data passing between client and server.
 *
 * @param Base - The base class to extend with GUI management
 * @returns Extended class with GUI management methods
 *
 * @example
 * ```ts
 * class MyPlayer extends WithGuiManager(BasePlayer) {
 *   constructor() {
 *     super();
 *     // GUI system is automatically initialized
 *   }
 * }
 *
 * const player = new MyPlayer();
 * await player.showText('Hello World!');
 * player.callMainMenu();
 * ```
 */
export function WithGuiManager<TBase extends PlayerCtor>(
  Base: TBase
): new (...args: ConstructorParameters<TBase>) => InstanceType<TBase> &
  IGuiManager {
  class GuiManagerMixin extends Base {
    _gui: { [id: string]: Gui } = {};

    showText(msg: string, options: DialogBaseOptions & { input: NumberInputOptions }): Promise<number | null>;
    showText(msg: string, options: DialogBaseOptions & { input: TextInputOptions | TextareaInputOptions }): Promise<string | null>;
    showText(msg: string, options?: DialogOptions): Promise<string | number | null>;
    showText(msg: string, options: DialogOptions = {}): Promise<string | number | null> {
      const gui = new DialogGui(<any>this);
      this._gui[gui.id] = gui;
      return gui.openDialog(msg, options);
    }

    showChoices(
      msg: string,
      choices: Choice[],
      options?: DialogBaseOptions
    ): Promise<Choice | null> {
      return this.showText(msg, {
        choices,
        ...options,
      }).then((indexSelected) => {
        if (typeof indexSelected !== 'number') return null;
        if (!choices[indexSelected]) return null;
        return choices[indexSelected];
      });
    }

    showNotification(
      message: string,
      options: { time?: number; icon?: string; sound?: string; type?: "info" | "warn" | "error" } = {}
    ): Promise<boolean> {
      ;(this as unknown as { emit(type: string, value?: unknown): void }).emit('notification', {
        message,
        ...options,
      });
      return Promise.resolve(true);
    }

    showInput(message: string, options: NumberInputOptions): Promise<number | null>;
    showInput(message: string, options?: TextInputOptions | TextareaInputOptions): Promise<string | null>;
    showInput(message: string, options: InputOptions): Promise<string | number | null>;
    showInput(message: string, options: InputOptions = {}): Promise<string | number | null> {
      const gui = new InputGui(<any>this);
      this._gui[gui.id] = gui;
      return gui.openInput(message, options);
    }

    callMainMenu(options: MenuGuiOptions = {}) {
      const gui = new MenuGui(<any>this);
      this._gui[gui.id] = gui;
      return gui.open(options);
    }

    /**
     * Display the persistent player hotbar.
     *
     * The server owns slot content and validates every use. The default client
     * GUI provides direct keyboard shortcuts and a gamepad radial selector.
     *
     * @title Show Hotbar
     * @method player.showHotbar(options)
     * @param options - Initialization and optional custom use handler.
     * @returns The GUI open result.
     * @memberof RpgPlayer
     *
     * @example
     * ```ts
     * player.showHotbar();
     * ```
     */
    showHotbar(options: HotbarGuiOptions = {}) {
      const existing = this._gui[PrebuiltGui.Hotbar] as HotbarGui | undefined;
      const gui = existing ?? new HotbarGui(this as unknown as RpgPlayer);
      this._gui[gui.id] = gui;
      return existing
        ? Promise.resolve(null)
        : gui.open(options);
    }

    /**
     * Hide the default hotbar GUI.
     *
     * @title Hide Hotbar
     * @method player.hideHotbar()
     * @returns {void}
     * @memberof RpgPlayer
     */
    hideHotbar(): void {
      this._gui[PrebuiltGui.Hotbar]?.close();
    }

    callGameover(options: GameoverGuiOptions = {}): Promise<GameoverGuiSelection | null> {
      const gui = new GameoverGui(<any>this);
      this._gui[gui.id] = gui;
      return gui.open(options);
    }

    showSaveLoad(slots: SaveSlot[] = [], options: SaveLoadOptions = {}): Promise<number | null> {
      const gui = new SaveLoadGui(<any>this);
      this._gui[gui.id] = gui;
      return gui.open(slots, options).then((index) => {
        if (typeof index !== 'number') return null;
        return index;
      });
    }

    showSave(slots: SaveSlot[] = [], options: SaveLoadOptions = {}): Promise<number | null> {
      return this.showSaveLoad(slots, { ...options, mode: 'save' });
    }

    showLoad(slots: SaveSlot[] = [], options: SaveLoadOptions = {}): Promise<number | null> {
      return this.showSaveLoad(slots, { ...options, mode: 'load' });
    }

    /**
     * Calls shop menu. Opens the GUI named `rpg-shop`
     *
     * @title Call Shop Menu
     * @method player.callShop()
     * @returns {void}
     * @memberof GuiManager
     */
    callShop(items: ShopItemInput[] | ShopGuiOptions): Promise<unknown | null> {
      const gui = new ShopGui(<any>this);
      this._gui[gui.id] = gui;
      return gui.open(items);
    }

    /**
     * Call a custom Gui

     * ```ts
     * // Calls a client-side component, created with VueJS, named "inn".
     * const gui = player.gui('inn')
     * 
     *  // You can wait for actions on the menu. It only works if the menu is open.
     * gui.on('accept', () => {
     *      player.allRecovery()
     * })
     * 
     * // The GUI is opened by passing recoverable data on the client side.
     * gui.open({ hello: 'world' })
     * ```
     * 
     * When opening the GUI, one can give options
     * 
     * ```ts
     * await gui.open({ hello: 'world' }, {
     *      waitingAction: true,
     *      blockPlayerInput: true
     * })
     * // After the GUI is closed
     * ```
     * 
     * - `blockPlayerInput`: while the GUI is open, the player can not move on the map
     * - `waitingAction`: We explicitly wait until the GUI is closed for the promise to be resolved.
     * 
     * @title Call custom GUI
     * @method player.gui(guiId)
     * @param {string} guiId
     * @returns {Gui}
     * @memberof GuiManager
     */
    gui(guiId: string) {
      const gui = new Gui(guiId, <any>this);
      this._gui[guiId] = gui;
      return gui;
    }

    getGui(guiId: string) {
      return this._gui[guiId];
    }

    /**
     * Closes the GUI and removes it from memory
     *
     * @title Close custom GUI
     * @method player.removeGui(guiId,data)
     * @param {string} guiId
     * @param {object} [data] Passing data if you close the GUI
     * @returns {Gui}
     * @memberof GuiManager
     */
    removeGui(guiId: string, data?: unknown, guiOpenId?: unknown): void {
      if (this._gui[guiId]) {
        if (!this._gui[guiId].matchesOpenId(guiOpenId)) {
          return;
        }
        this._gui[guiId].close(data);
        delete this._gui[guiId];
      }
    }

    _attachedGui(players: RpgPlayer[] | RpgPlayer, display: boolean) {
      if (!Array.isArray(players)) {
        players = [players] as RpgPlayer[];
      }
      (this as any).emit("gui.tooltip", {
        players: (players as RpgPlayer[]).map((player) => player.id),
        display,
      });
    }

    /**
     * Display the GUI attached to the players
     *
     * If you don't specify the players as parameters, it will display the GUI of the instance
     * But you can specify which GUIs to display by specifying the players as the first parameter
     *
     * @title View to GUI attached
     * @method player.showAttachedGui(players?)
     * @param {RpgPlayer[] | RpgPlayer} [players] The GUIs attached to the players to display
     * @since 3.0.0-beta.5
     * @example
     * ```ts
     * player.showAttachedGui()
     * ```
     * ```ts
     * player.showAttachedGui(aPlayer)
     * ```
     * ```ts
     * player.showAttachedGui([player1, player2])
     * ```
     * @memberof GuiManager
     * */
    showAttachedGui(players?: RpgPlayer[] | RpgPlayer) {
      const _players = players || this;
      this._attachedGui(_players as RpgPlayer[], true);
    }

    /**
     * Hide the GUI attached to the players
     *
     * @title Hide to GUI attached
     * @method player.hideAttachedGui(players?)
     * @param {RpgPlayer[] | RpgPlayer} [players] The GUIs attached to the players to hide
     * @since 3.0.0-beta.5
     * @example
     * ```ts
     * player.hideAttachedGui()
     * ```
     * ```ts
     * player.hideAttachedGui(aPlayer)
     * ```
     * ```ts
     * player.hideAttachedGui([player1, player2])
     * ```
     * @memberof GuiManager
     * */
    hideAttachedGui(players?: RpgPlayer[] | RpgPlayer) {
      const _players = players || this;
      this._attachedGui(_players as RpgPlayer[], false);
    }
  }

  return GuiManagerMixin as unknown as any;
}

/**
 * Interface for GUI management capabilities
 * Defines the methods that will be available on the player
 */
export interface IGuiManager {
  /**
   * Opens the prebuilt input GUI and waits for the player to submit or cancel it.
   * The player cannot move while the form is open. Number inputs resolve to a
   * `number`; text inputs and textareas resolve to a `string`; cancellation and
   * an empty optional number input resolve to `null`.
   *
   * ```ts
   * const age = await player.showInput('Your age', {
   *   type: 'number',
   *   required: true,
   *   min: 1
   * })
   * // age is number | null
   *
   * const biography = await player.showInput('Biography', {
   *   control: 'textarea',
   *   rows: 6,
   *   maxLength: 500
   * })
   * // biography is string | null
   * ```
   *
   * @title Show Input
   * @method player.showInput(message,options)
   * @param {string} message Label or question displayed above the field.
   * @param {InputOptions} [options] Field type, control, initial value, labels, and validation constraints.
   * @returns {Promise<string | number | null>} The typed submitted value, or `null` when cancelled or when an optional number is empty.
   * @memberof GuiManager
   */
  showInput(message: string, options: NumberInputOptions): Promise<number | null>;
  showInput(message: string, options?: TextInputOptions | TextareaInputOptions): Promise<string | null>;
  showInput(message: string, options: InputOptions): Promise<string | number | null>;

  /**
   * Show a text. This is a graphical interface already built. Opens the GUI named `rpg-dialog`
   *
   * ```ts
   * player.showText('Hello World')
   * ```
   *
   * The method returns a promise. It is resolved when the dialog box is closed.
   *
   * ```ts
   * await player.showText('Hello World')
   * // dialog box is closed, then ...
   * ```
   *
   * **Option: position**
   *
   * You can define how the dialog box is displayed:
   * - top
   * - middle
   * - bottom
   *
   * (bottom by default)
   *
   * ```ts
   * player.showText('Hello World', {
   *      position: 'top'
   * })
   * ```
   *
   * Add a typed input directly below the dialog text:
   *
   * ```ts
   * const age = await player.showText('How old are you?', {
   *   input: { type: 'number', required: true, min: 1 }
   * })
   * // age is number | null
   * ```
   *
   * **Option: fullWidth**
   *
   * `boolean` (true by default)
   *
   * Indicate that the dialog box will take the full width of the screen.
   *
   * ```ts
   * player.showText('Hello World', {
   *      fullWidth: true
   * })
   * ```
   *
   * **Option: autoClose**
   *
   * `boolean` (false by default)
   *
   * If false, the user will have to press Enter to close the dialog box.
   *
   *  ```ts
   * player.showText('Hello World', {
   *      autoClose: true
   * })
   * ```
   *
   * **Option: typewriterEffect**
   *
   * `boolean` (true by default)
   *
   * Performs a typewriter effect
   *
   *  ```ts
   * player.showText('Hello World', {
   *      typewriterEffect: false
   * })
   * ```
   *
   * **Option: talkWith**
   *
   * `RpgPlayer` (nothing by default)
   *
   * If you specify the event or another player, the other player will stop his or her movement and look in the player's direction.
   *
   *  ```ts
   * // Code in an event
   * player.showText('Hello World', {
   *      talkWith: this
   * })
   * ```
   *
   * @title Show Text
   * @method player.showText(text,options)
   * @param {string} text
   * @param {object} [options] the different options, see usage below
   * @returns {Promise}
   * @memberof GuiManager
   */
  showText(msg: string, options: DialogBaseOptions & { input: NumberInputOptions }): Promise<number | null>;
  showText(msg: string, options: DialogBaseOptions & { input: TextInputOptions | TextareaInputOptions }): Promise<string | null>;
  showText(msg: string, options?: DialogOptions): Promise<string | number | null>;

  /**
   * Shows a dialog box with a choice. Opens the GUI named `rpg-dialog`
   *
   * ```ts
   * const choice = await player.showChoices('What color do you prefer?', [
   *      { text: 'Black', value: 'black' },
   *      { text: 'Rather the blue', value: 'blue' },
   *      { text: 'I don\'t have a preference!', value: 'none' }
   * ])
   *
   * // If the player selects the first
   * console.log(choice) // { text: 'Black', value: 'black' }
   * ```
   *
   * @title Show Choices
   * @method player.showChoices(text,choices)
   * @param {string} text
   * @param {Array<{ text: string, value: any }>} choices
   * @param {object} [options] Same options as the openDialog method
   * @returns {Promise<Choice | null>}
   * @memberof GuiManager
   */
  showChoices(
    msg: string,
    choices: Choice[],
    options?: DialogBaseOptions
  ): Promise<Choice | null>;

  /**
   * Displays a notification . Opens the GUI named `rpg-notification`
   *
   * @title Displays a notification
   * @method player.showNotification()
   * @param {string} message - The message to display in the notification
   * @param {object} options - An object containing options for the notification
   * @param {number} options.time - The time to display the notification for (in ms). Default: 2000ms
   * @param {string} options.icon - The icon to display in the notification. Put the identifier of the spritesheet (defined on the client side)
   * @param {string} options.sound - The sound to play when the notification is shown. Set the sound ID (defined on the client side)
   * @returns {void}
   * @memberof GuiManager
   */
  showNotification(
    message: string,
    options?: { time?: number; icon?: string; sound?: string; type?: "info" | "warn" | "error" }
  ): Promise<boolean>;

  /**
   * Display a save/load slots screen. Opens the GUI named `rpg-save`
   *
   * ```ts
   * const index = await player.showSaveLoad(slots, { mode: 'save' })
   * ```
   *
   * @title Show Save/Load
   * @method player.showSaveLoad(slots,options)
   * @param {Array<object>} slots
   * @param {object} [options]
   * @returns {Promise<number | null>}
   * @memberof GuiManager
   */
  showSaveLoad(slots?: SaveSlot[], options?: SaveLoadOptions): Promise<number | null>;

  /**
   * Display a save slots screen. Opens the GUI named `rpg-save`
   *
   * ```ts
   * const index = await player.showSave(slots)
   * ```
   *
   * @title Show Save
   * @method player.showSave(slots,options)
   * @param {Array<object>} slots
   * @param {object} [options]
   * @returns {Promise<number | null>}
   * @memberof GuiManager
   */
  showSave(slots?: SaveSlot[], options?: SaveLoadOptions): Promise<number | null>;

  /**
   * Display a load slots screen. Opens the GUI named `rpg-save`
   *
   * ```ts
   * const index = await player.showLoad(slots)
   * ```
   *
   * @title Show Load
   * @method player.showLoad(slots,options)
   * @param {Array<object>} slots
   * @param {object} [options]
   * @returns {Promise<number | null>}
   * @memberof GuiManager
   */
  showLoad(slots?: SaveSlot[], options?: SaveLoadOptions): Promise<number | null>;
  /**
   * Calls main menu. Opens the GUI named `rpg-main-menu`
   *
   * @title Call Main Menu
   * @method player.callMainMenu(options)
   * @param {object} [options]
   * @returns {void}
   * @memberof GuiManager
   */
  callMainMenu(options?: MenuGuiOptions): void;
  showHotbar(options?: HotbarGuiOptions): Promise<unknown | null>;
  hideHotbar(): void;

  /**
   * Calls game over menu. Opens the GUI named `rpg-gameover`
   *
   * ```ts
   * const selection = await player.callGameover()
   * if (selection?.id === 'title') {
   *     await player.gui('rpg-title-screen').open()
   * }
   * if (selection?.id === 'load') {
   *     await player.showLoad()
   * }
   * ```
   *
   * @title Call Game Over Menu
   * @method player.callGameover(options)
   * @param {object} [options]
   * @returns {Promise<GameoverGuiSelection | null>}
   * @memberof GuiManager
   */
  callGameover(options?: GameoverGuiOptions): Promise<GameoverGuiSelection | null>;
  callShop(items: ShopItemInput[] | ShopGuiOptions): Promise<unknown | null>;
  gui(guiId: string): Gui;
  getGui(guiId: string): Gui;
  removeGui(guiId: string, data?: unknown, guiOpenId?: unknown): void;
  showAttachedGui(players?: RpgPlayer[] | RpgPlayer): void;
  hideAttachedGui(players?: RpgPlayer[] | RpgPlayer): void;
}
