import { merge } from './common'
import { EfficiencyOptions } from './efficiency'

export interface ActorGlobalOptions extends EfficiencyOptions {
    name: string
    parameters?: {
        [key: string]: {
            start: number, 
            end: number
        }
    },
    startingEquipment?: any[]
    class?: any
}

interface ActorOptions extends ActorGlobalOptions {
    initialLevel?: number,
    finalLevel?: number,
    expCurve?: {
        basis: number,
        extra: number,
        accelerationA: number,
        accelerationB: number
    }
}

export function Actor(options: ActorOptions) {
    return merge(options, 'actor')
}