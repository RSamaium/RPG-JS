interface MapOptions {
    /** 
     * Map identifier. Allows to go to the map (for example with player.changeMap())
     * 
     * @prop {string} id
     * @memberof MapData
     * */
    id: string,

     /** 
     * the path to the .tmx file (Tiled Map Editor)
     * 
     * Remember to use `require()` function
     * 
     * ```ts
     * import { MapData, RpgMap } from '@rpgjs/server'
     * 
     * @MapData({
     *      id: 'town',
     *      file: require('./tmx/town.tmx')
     * })
     * class TownMap extends RpgMap { } 
     * ``` 
     * @prop {string} file
     * @memberof MapData
     * */
    file: string,

    /** 
     * The name of the map.
     * @prop {string} [name]
     * @memberof MapData
     * */
    name?: string,

     /** 
     * Map events. This is an array containing `RpgEvent` classes. 
     * You can also give an object that will indicate the positions of the event on the map.
     * 
     * ```ts
     * import { MapData, RpgMap, EventData, RpgEvent } from '@rpgjs/server'
     * 
     * @EventData({
     *      name: 'Ev-1'
     * })
     * class NpcEvent extends RpgEvent { }
     * 
     * @MapData({
     *      id: 'medieval',
     *      file: require('./tmx/town.tmx'),
     *      events: [NpcEvent]
     * })
     * class TownMap extends RpgMap {}
     * ```
     * 
     * If the positions are not defined, the event will be placed on a Tiled Map Editor shape ([/guide/create-event.html#position-the-event-on-the-map](Guide)). Otherwise, it will be placed at {x:0, y:0 }
     * 
     * You can give positions:
     * 
     * ```ts
     * events: [{ event: NpcEvent, x: 10, y: 30 }]
     * ```
     * 
     * @prop {Array<Class RpgEvent> | { event: Class RpgEvent, x: number, y: number }} [events]
     * @memberof MapData
     * */
    events?: { event: any, x: number, y: number }[] | any[],

    /** 
     * The sounds that will be played when the map is open. Sounds must be defined on the client side. Then, put the name of the sound identifier
     * 
     * @prop {Array<string>} [sounds]
     * @memberof MapData
     * */
    sounds?: string[]
}

export function MapData(options: MapOptions) {
    return (target) => {
        target.file = options.file
        target.id = options.id
        target.prototype.name = options.name
        target.prototype.file = options.file
        target.prototype.id = options.id
        target.prototype.sounds = options.sounds
        target.prototype._events = options.events
    }
}