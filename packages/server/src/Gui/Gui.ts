import { RpgPlayer } from '../Player/Player'
import { EventEmitter } from '@rpgjs/common'

export class Gui extends EventEmitter {

    private _close: Function = () => {}
    private _blockPlayerInput: boolean = false

    constructor(
        public id: string,
        protected player: RpgPlayer,
    ) {
        super()
    }

    open(data?, {
        waitingAction = false,
        blockPlayerInput = false
    } = {}): Promise<any> {
        return new Promise((resolve) => {
            this.player.moving = false
            this.player.emit('gui.open', {
                guiId: this.id,
                data
            })
            this._blockPlayerInput = blockPlayerInput
            if (blockPlayerInput) {
                this.player.canMove = false
            }
            if (!waitingAction) {
                resolve(null)
            }
            else {
                this._close = resolve
            }
        })
    }

    close(data?) {
        this.player.emit('gui.exit', this.id)
        if (this._blockPlayerInput) {
            this.player.canMove = true
        }
        this._close(data)
    }
}