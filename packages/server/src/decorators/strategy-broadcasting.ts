import RpgPlayer from '../Player'

interface StrategyBroadcastingOptions {
    params: string[],
    query(player: RpgPlayer): RpgPlayer | RpgPlayer[]
}

export function StrategyBroadcasting(params: StrategyBroadcastingOptions[] | string[]) {
    return function (target) {
        target.prototype.$broadcast = params
    }
}