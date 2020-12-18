import { merge, Data } from './common'
import { EfficiencyOptions } from './interfaces/efficiency'

export interface ActorGlobalOptions extends EfficiencyOptions, Data {
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