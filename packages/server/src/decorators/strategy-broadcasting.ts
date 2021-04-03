import { RpgPlayer } from '../Player/Player'

interface StrategyBroadcastingOptions {
    params: any[],
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