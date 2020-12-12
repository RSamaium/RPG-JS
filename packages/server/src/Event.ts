import { RpgPlayer } from './Player/Player'
import { Utils } from '@rpgjs/common';
import { World } from '@rpgjs/sync-server'

export default class RpgEvent extends RpgPlayer  {

    public readonly type: string = 'event'

    execMethod(methodName: string, methodData = []) {
        if (!this[methodName]) {
            return
        }
        const ret = this[methodName](...methodData)
        const sync = () => {
            const player: any = methodData[0]
            if (player instanceof RpgPlayer) {
                player.syncChanges()
            }
            const room = World.getRoom(this.map)
            if (room.$detectChanges) room.$detectChanges()
        }
        if (Utils.isPromise(ret)) {
            ret.then(sync)
        }
        else {
            sync()
        }
    }

    setGraphic(graphic) {
        super.setGraphic(graphic)
    }
}