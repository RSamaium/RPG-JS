import { EventMode } from '../Event'

export interface EventOptions {
    mode?: EventMode,
    width?: number,
    height: number,
    hitbox?: { 
        width?: number, 
        height?: number
    },
    name: string
}

export function EventData(options: EventOptions) {
    return (target) => {
        target.mode = options.mode || EventMode.Shared
        target.width = options.width
        target.height = options.height
        target.hitbox = options.hitbox
        target.prototype._name = options.name
    }
}