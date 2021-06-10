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
        const ret = await RpgPlugin.emit(`Server.${methodName}`, [this, ...methodData], true)
        const player: any = methodData[0]
        if (player instanceof RpgPlayer) {
            player.syncChanges()
        }
        return ret
    }
}