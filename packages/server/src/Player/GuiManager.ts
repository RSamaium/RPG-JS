import { Utils } from '@rpgjs/common'
import { RpgPlayer } from './Player'
import { Gui, DialogGui, MenuGui, ShopGui, NotificationGui } from '../Gui'
import { DialogOptions, Choice } from '../Gui/DialogGui'

export class GuiManager {

    _gui: { [id: string]: Gui }

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
    showText(msg: string, options: DialogOptions = {}): Promise<any> {
        const gui = new DialogGui(<any>this)
        this._gui[gui.id] = gui
        return gui.openDialog(msg, options)
    }

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
    showChoices(msg: string, choices: Choice[], options?: DialogOptions): Promise<Choice | null> {
        return this
            .showText(msg, {
                choices,
                ...options
            })
            .then((indexSelected: number) => {
                if (!choices[indexSelected]) return null
                return choices[indexSelected]
            })
    }

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
    showNotification(message: string, options: { time?: number, icon?: string, sound?: string } = {}): Promise<any> {
        const gui = new NotificationGui(<any>this)
        this._gui[gui.id] = gui
        const data = {
            message,
            ...options
        }
        return gui.open(data)
    }

    /**
     * Calls main menu. Opens the GUI named `rpg-main-menu`
     * 
     * @title Call Main Menu
     * @method player.callMainMenu()
     * @returns {void}
     * @memberof GuiManager
     */
    callMainMenu() {
        const gui = new MenuGui(<any>this)
        this._gui[gui.id] = gui
        return gui.open()
    }

    /**
     * Calls shop menu. Opens the GUI named `rpg-shop`
     * 
     * @title Call Shop Menu
     * @method player.callShop()
     * @returns {void}
     * @memberof GuiManager
     */
    callShop(items: any[]) {
        const gui = new ShopGui(<any>this)
        this._gui[gui.id] = gui
        return gui.open(items)
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
        const gui = new Gui(guiId, <any>this)
        this._gui[guiId] = gui
        return gui
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
    removeGui(guiId: string, data?: any) {
        if (this._gui[guiId]) {
            this._gui[guiId].close(data)
            delete this._gui[guiId]
        }
    }

    private _attachedGui(players: RpgPlayer[] | RpgPlayer, display: boolean) {
        if (!Utils.isArray(players)) {
            players = [players] as RpgPlayer[]
        }
        this.emit('gui.tooltip', {
            players: (players as RpgPlayer[]).map(player => player.id),
            display
        })
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
        const _players = players || this
        this._attachedGui(_players as RpgPlayer[], true)
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
        const _players = players || this
        this._attachedGui(_players as RpgPlayer[], false)
    }
}

export interface GuiManager {
    emit: any
}