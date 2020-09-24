import RpgPlayer from '../Player'
import { EventEmitter } from '../../common/EventEmitter'

export class Gui extends EventEmitter {

    private _close: Function = () => {}

    constructor(
        public id: string,
        private player: RpgPlayer,
    ) {
        super()
    }

    open(data?, waitingAction: boolean = false) {
        return new Promise((resolve) => {
            this.player._emit('gui.open', {
                guiId: this.id,
                data
            })
            if (!waitingAction) {
                resolve()
            }
            else {
                this._close = resolve
            }
        })
    }

    close(data?) {
        this.player._emit('gui.exit', this.id)
        this._close(data)
    }
}