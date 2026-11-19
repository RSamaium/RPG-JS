export enum EventMode {
    Shared = 'shared',
    Scenario = 'scenario'
}

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
     * Whether players can physically push this event.
     *
     * `false` by default. Use `mass` to tune resistance once pushing is enabled.
     */
    pushable?: boolean,
    /** Physical mass used when the event is pushable. `0` or `Infinity` makes it immovable. */
    mass?: number,

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
    name: string,

    /**
     * Tags of the event: what kind of event it is, for the scripts and modules that react to kinds of events rather
     * than to names. The event gives them in `event.tags`.
     *
     * ```ts
     * @EventData({ name: 'EV-1', tags: ['help', 'villager'] })
     * export class VillagerEvent extends RpgEvent { }
     * ```
     *
     * @prop {string[]} [tags]
     * @memberof EventData
     * */
    tags?: string[]
}

export function EventData(options: EventOptions) {
    return (target) => {
        target.mode = options.mode || EventMode.Shared
        target.width = options.width
        target.height = options.height
        target.hitbox = options.hitbox
        target.pushable = options.pushable
        target.mass = options.mass
        target.prototype._eventDataPushable = options.pushable
        target.prototype._eventDataMass = options.mass
        target._name = options.name
        target.prototype._name = options.name
        target._tags = options.tags
        target.prototype._tags = options.tags
        target.prototype.mode = target.mode
    }
}
