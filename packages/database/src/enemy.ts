import { merge } from './common'

interface EnemyOptions {
    name: string
    level?: number
    parameters?: {
        [key: string]: {
            start: number, 
            end: number
        }
    },
    equipment?: any[]
    items?: [{ nb: number, item: any }]
    stateEfficency?: any[]
    elementEfficency?: any[]
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