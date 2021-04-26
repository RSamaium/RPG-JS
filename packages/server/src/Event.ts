import { RpgPlayer } from './Player/Player'
import { Utils } from '@rpgjs/common';
import { World } from '@rpgjs/sync-server'

export enum EventMode {
    Shared = 'shared',
    Scenario = 'scenario'
}

export class RpgEvent extends RpgPlayer  {

    public readonly type: string = 'event'
    properties: any = {}

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
}