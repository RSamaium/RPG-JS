import RpgPlayer from '../Player'
import { BaseTypes } from 'lance-gg'

interface StrategyBroadcastingOptions {
    params: string[],
    query(player: RpgPlayer): RpgPlayer | RpgPlayer[]
}

export function StrategyBroadcasting(params: StrategyBroadcastingOptions[] | string[]) {
    return function (target) {
        target.prototype.$broadcast = params
        /*target.prototype.netScheme = {
            hp: { type: BaseTypes.TYPES.INT8 }
        }*/
    }
}