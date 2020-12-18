import { Gui, DialogGui, MenuGui, ShopGui } from '../Gui'
import { DialogOptions, Choice } from '../Gui/DialogGui'

export class GuiManager {

    _gui: { [id: string]: Gui }
    
    /**
     * Show a text. This is a graphical interface already built
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

    showChoices(msg: string, choices: Choice[]): Promise<Choice | null> {
        return this
            .showText(msg, {
                choices
            })
            .then((indexSelected: number) => {
                if (!choices[indexSelected]) return null
                return choices[indexSelected]
            })
    }

    callMainMenu() {
        const gui = new MenuGui(<any>this)
        this._gui[gui.id] = gui
        return gui.open()
    }

    callShop(items: any[]) {
        const gui = new ShopGui(<any>this)
        this._gui[gui.id] = gui
        return gui.open(items)
    }

    showEffect() {
        this.emit('player.callMethod', { 
            objectId: this.playerId,
            name: 'addEffect',
            params: []
        })
    }

    showAnimation() {
        this.emit('player.callMethod', { 
            objectId: this.playerId,
            name: 'showAnimation',
            params: []
        })
    }

    gui(guiId: string) {
        const gui = new Gui(guiId, <any>this)
        this._gui[guiId] = gui
        return gui
    }

    removeGui(guiId: string, data: any) {
        if (this._gui[guiId]) {
            this._gui[guiId].close(data)
            delete this._gui[guiId]
        }
    }

}

export interface GuiManager{ 
    playerId: number
    emit: (key, value) => void
}