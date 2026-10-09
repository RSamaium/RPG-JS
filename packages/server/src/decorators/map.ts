import type { LightingState, WeatherState } from "@rpgjs/common";
import type { MapEventDefinition, MapEventPlacement } from "../rooms/map";
import type { RpgPlayer } from "../Player/Player";
import type { RpgSyncSchema } from "../Player/types";

export interface MapOptions {
    /** 
     * Map identifier. Allows to go to the map (for example with player.changeMap())
     * 
     * @prop {string} [id]
     * @memberof MapData
     * */
    id?: string,

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
    file?: unknown,

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
    * If the positions are not defined, the event will be placed on a Tiled Map Editor shape ([/guide/create-event.html#position-the-event-on-the-map](Guide)). Otherwise, it will be placed at `{x:0, y:0 }`
    * 
    * You can give positions:
    * 
    * ```ts
    * events: [{ event: NpcEvent, x: 10, y: 30 }]
    * ```
    *
    * For object-based events, put the hooks in the `event` property and keep map placement
    * (`x`, `y`, `id`) at the wrapper level:
    *
    * ```ts
    * events: [{
    *   x: 200,
    *   y: 120,
    *   event: {
    *     onInit() {
    *       this.setGraphic('female')
    *     }
    *   }
    * }]
    * ```
    * 
    * @prop {(MapEventDefinition | MapEventPlacement)[]} [events]
    * @memberof MapData
    * */
    events?: (MapEventDefinition | MapEventPlacement)[],

    /** 
     * The sounds that will be played when the map is open. Sounds must be defined on the client side. Then, put the name of the sound identifier
     * 
     * So, it is possible to play several sounds (in loop or not) on the card. You can put a background music (BGM) and a background noise (BGS) for example
     * 
     *  ```ts
     * sounds: ['my-bgm', 'my-bgs']
     * ```
     * 
     * And client side:
     * 
     * ```ts
     * import { Sound } from '@rpgjs/client'
     * 
     * @Sound({
     *      sounds: {
     *          'my-bgm': require('./assets/bgm.ogg'),
     *          'my-bgs': require('./assets/bgs.ogg')
     *      },
     *      loop: true
     * })
     * export class Sounds {}
     * ```
     * 
     * See [https://docs.rpgjs.dev/classes/sound.html#properties](RpgSound Decorator)
     * 
     * @prop {Array<string>} [sounds]
     * @memberof MapData
     * */
    sounds?: string[]

    /**
     * Initial weather state for this map.
     *
     * This value is applied when the map is loaded and can later be updated
     * at runtime with `map.setWeather()` from server logic.
     *
     * ```ts
     * @MapData({
     *   id: 'forest',
     *   file: require('./tmx/forest.tmx'),
     *   weather: {
     *     effect: 'fog',
     *     preset: 'rpgForestFog',
     *     params: { density: 1.2, height: 0.75 },
     *     transitionMs: 1200
     *   }
     * })
     * class ForestMap extends RpgMap {}
     * ```
     */
    weather?: WeatherState | null

    /**
     * Initial lighting state for this map.
     *
     * This value is applied when the map is loaded and can later be updated
     * at runtime with `map.setLighting()` from server logic.
     */
    lighting?: LightingState | null

    /** 
     * Whether to stop all sounds before playing the map sounds when a player joins.
     * 
     * If set to `true`, all currently playing sounds will be stopped before playing the new map sounds.
     * This prevents sound overlap when changing maps.
     * 
     * By default, this is `false`, meaning sounds from the previous map will continue playing.
     * 
     * ```ts
     * @MapData({
     *     id: 'battle-map',
     *     sounds: ['battle-theme'],
     *     stopAllSoundsBeforeJoin: true // Stop all sounds before playing battle theme
     * })
     * class BattleMap extends RpgMap {}
     * ```
     * 
     * @prop {boolean} [stopAllSoundsBeforeJoin=false]
     * @memberof MapData
     * @since 5.0.0
     * */
    stopAllSoundsBeforeJoin?: boolean

    /** 
     * Specify which properties will be synchronized with the client. On the client side, you can retrieve the values synchronized with the valueChanges property on the scene
     * 
     * You must create the schema:
     * 
     * ```ts
     * import { MapData, RpgMap } from '@rpgjs/server'
     * 
     * @MapData({
     *      id: 'medieval',
     *      file: require('./tmx/town.tmx'),
     *      syncSchema: {
     *          count: Number
     *      }
     * })
     * export class TownMap extends RpgMap {
     *      count: number = 0
     * 
     *      onLoad() {}
     * 
     *      onJoin() {
     *          this.count++
     *      }
     * 
     *      onLeave(player) {
     *          super.onLeave(player)
     *          this.count--
     *      }
     * }
     * 
     * ```
     * 
     * If you want to change the scheme of players and events, consider overwriting the existing scheme
     * 
     *  ```ts
     * import { MapData, RpgMap, RpgPlayer } from '@rpgjs/server'
     * 
     * 
     * declare module '@rpgjs/server' {
     *  export interface RpgPlayer {
     *      customProp: string
     *  }
     * }
     * 
     * @MapData({
     *      id: 'medieval',
     *      file: require('./tmx/town.tmx'),
     *      syncSchema: {
     *          users: [
     *              {
     *                  customProp: String,
     *                  ...RpgPlayer.schemas
     *              }
     *          ]
     *      }
     * })
     * export class TownMap extends RpgMap {}
     * ```
     * 
     * The properties are called `users` and `events`. Their scheme is identical and defined in `RpgPlayer.schemas`. To write schematics, refer to the [documentation of the simple-room](https://github.com/RSamaium/simple-room) module
     * 
     * @prop {object} [syncSchema]
     * @memberof MapData
     * */
    syncSchema?: RpgSyncSchema

    /** 
     * Decreases the RAM of the map. In this case, some instructions will be different.
     * 
     * `map.getTileByIndex()` will not return all tiles of an index but only the tile of the highest layer
     * 
     * > You can also use the `low-memory` property in Tiled maps
     * 
     * @prop {boolean} [lowMemory=false]
     * @since 3.1.0
     * @memberof MapData
     * */
    lowMemory?: boolean

    /** 
     * Called when the map is loaded and initialized
     * 
     * This hook is executed once when the map data is loaded and ready.
     * Use this to initialize map-specific properties or setup.
     * 
     * @prop { () => any } [onLoad]
     * @memberof MapData
     * @example
     * ```ts
     * @MapData({
     *     id: 'town',
     *     file: require('./tmx/town.tmx'),
     *     onLoad() {
     *         console.log('Town map loaded')
     *         // Initialize map properties
     *     }
     * })
     * class TownMap extends RpgMap {}
     * ```
     * */
    onLoad?: () => any

    /** 
     * Called when a player joins the map
     * 
     * This hook is executed each time a player joins the map.
     * Use this to perform actions when a player enters the map.
     * 
     * @prop { (player: RpgPlayer) => any } [onJoin]
     * @memberof MapData
     * @example
     * ```ts
     * @MapData({
     *     id: 'town',
     *     file: require('./tmx/town.tmx'),
     *     onJoin(player: RpgPlayer) {
     *         console.log(`${player.name} joined the town`)
     *         // Perform actions when player joins
     *     }
     * })
     * class TownMap extends RpgMap {}
     * ```
     * */
    onJoin?: (player: RpgPlayer) => any

    /** 
     * Called when a player leaves the map
     * 
     * This hook is executed each time a player leaves the map.
     * Use this to perform cleanup or actions when a player exits the map.
     * 
     * @prop { (player: RpgPlayer) => any } [onLeave]
     * @memberof MapData
     * @example
     * ```ts
     * @MapData({
     *     id: 'town',
     *     file: require('./tmx/town.tmx'),
     *     onLeave(player: RpgPlayer) {
     *         console.log(`${player.name} left the town`)
     *         // Perform cleanup when player leaves
     *     }
     * })
     * class TownMap extends RpgMap {}
     * ```
     * */
    onLeave?: (player: RpgPlayer) => any
}

export function MapData(options: MapOptions) {
    return (target) => {
        target.file = options.file
        target.id = options.id
        target.type = 'map'
        target.prototype.name = options.name
        target.prototype.file = options.file
        target.prototype.id = options.id
        target.prototype.sounds = options.sounds
        target.prototype.weather = options.weather
        target.prototype.lighting = options.lighting
        target.prototype.lowMemory = options.lowMemory
        target.prototype.stopAllSoundsBeforeJoin = options.stopAllSoundsBeforeJoin

        target.prototype.$schema = {}

        if (options.syncSchema) {
            target.prototype.$schema = options.syncSchema
        }
        target.prototype._events = options.events
        
        // Store hooks on prototype
        if (options.onLoad) {
            target.prototype.onLoad = options.onLoad
        }
        if (options.onJoin) {
            target.prototype.onJoin = options.onJoin
        }
        if (options.onLeave) {
            target.prototype.onLeave = options.onLeave
        }
    }
}
