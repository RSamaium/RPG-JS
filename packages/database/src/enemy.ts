import { merge } from './common'
import { ActorGlobalOptions } from './actor'

interface EnemyOptions extends ActorGlobalOptions {
    startingItems?: [{ nb: number, item: any }]
    graphic?: string,
    gain?: {
        exp?: number
        gold?: number
        items?: [{ nb: number, item: any, chance?: number }]
    }
}

export function Enemy(options: EnemyOptions) {
    return merge({
        options
    }, 'enemy')
}