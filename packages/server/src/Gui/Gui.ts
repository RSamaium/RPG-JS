import RpgPlayer from '../Player'
import { EventEmitter } from '@rpgjs/common'

export class Gui extends EventEmitter {

    private _close: Function = () => {}
    private _blockPlayerInput: boolean = false

    constructor(
        public id: string,
        private player: RpgPlayer,
    ) {
        super()
    }

    open(data?, {
        waitingAction = false,
        blockPlayerInput = false
    } = {}): Promise<any> {
        return new Promise((resolve) => {
            this.player._emit('gui.open', {
                guiId: this.id,
                data
            })
            this._blockPlayerInput = blockPlayerInput
            if (blockPlayerInput) {
                this.player.canMove = 0
            }
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
        if (this._blockPlayerInput) {
            this.player.canMove = 1
        }
        this._close(data)
    }
}