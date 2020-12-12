import { Gui, DialogGui, MenuGui, ShopGui } from '../Gui'

export class GuiManager {

    _gui: { [id: string]: Gui }
    
    showText(msg: string, options: {
        choices?: any[],
        position?,
        fullWidth?: boolean,
        autoClose?: boolean,
        tranparent?: boolean,
        typewriterEffect?: boolean
     } = {}) {
        const gui = new DialogGui(<any>this)
        this._gui[gui.id] = gui
        return gui.open(msg, options)
    }

    showChoices(msg: string, choices: { text: string, value: any }[]) {
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