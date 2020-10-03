import { merge } from './common'

interface ActorOptions {
    name: string,
    initialLevel?: number,
    finalLevel?: number,
    expCurve?: {
        basis: number,
        extra: number,
        accelerationA: number,
        accelerationB: number
    },
    parameters?: {
        [key: string]: {
            start: number, 
            end: number
        }
    },
    startingEquipment?: any[],
    class?: any
}

export function Actor(options: ActorOptions) {
    return merge(options, 'actor')
}