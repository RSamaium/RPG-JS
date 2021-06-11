import { RpgPlayer } from './Player/Player'
import { Utils, RpgPlugin } from '@rpgjs/common';

export enum EventMode {
    Shared = 'shared',
    Scenario = 'scenario'
}

export class RpgEvent extends RpgPlayer  {

    public readonly type: string = 'event'
    properties: any = {}

    async execMethod(methodName: string, methodData = []) {
        if (!this[methodName]) {
            return
        }
        const ret = this[methodName](...methodData)
        const sync = () => {
            const player: any = methodData[0]
            if (player instanceof RpgPlayer) {
                player.syncChanges()
            }
        }
        if (Utils.isPromise(ret)) {
            ret.then(sync)
        }
        else {
            sync()
        }
        return ret
    }
}