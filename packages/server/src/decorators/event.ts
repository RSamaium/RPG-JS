import { EventMode } from "../Game/EventManager"

export interface EventOptions {
    /** 
     * The mode of the event, shared evening or scenario
     * 
     * The scenario mode allows you to have events specific to the player. Thus, the graphics, the positions of the event will be different for each player. Beware of performance! The event is duplicated by each player.
     * 
     * `shared` mode by default
     * 
     * ```ts
     * import { RpgEvent, EventData, RpgPlayer, EventMode } from '@rpgjs/server'
     * @EventData({
     *      name: 'EV-1',
     *      mode: EventMode.Scenario // or EventMode.Shared
     * })
     * export class CharaEvent extends RpgEvent { }
     * ```
     * 
     * @prop {string} [mode] Either "shared" or "scenario".
     * @memberof EventData
     * */
    mode?: EventMode,

    width?: number,
    height?: number,

    /** 
     * The hitbox of the event. By default, this is the size of the tile of the map
     * 
     * @prop { { width: number, height: number }} [hitbox]
     * @memberof EventData
     * */
    hitbox?: {
        width?: number,
        height?: number
    },

    /** 
     * Name of the event. This is its identifier. it allows you to retrieve an event and place it on the map
     * 
     * @prop {string} name
     * @memberof EventData
     * */
    name: string
}

export function EventData(options: EventOptions) {
    return (target) => {
        target.mode = options.mode || EventMode.Shared
        target.width = options.width
        target.height = options.height
        target.hitbox = options.hitbox
        target._name = options.name
        target.prototype._name = options.name
        target.prototype.mode = target.mode
    }
}