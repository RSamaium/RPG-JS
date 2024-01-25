import { ModuleType, RpgShape, Direction, Control } from '@rpgjs/common'
import { RpgClassEvent, RpgEvent, RpgPlayer } from './Player/Player'
import { RpgMap } from './Game/Map'
import { RpgServerEngine } from './server'
import { MapOptions } from './decorators/map'
import { RpgClassMap } from './Scenes/Map'
import { TiledMap } from '@rpgjs/tiled'
import { WorldMap } from './Game/WorldMaps'
import { MatchMakerOption, RpgMatchMaker } from './MatchMaker'
import { IStoreState } from './Interfaces/StateStore'

export interface RpgServerEngineHooks {
    /**
     *  When the server starts
     * 
     * @prop { (engine: RpgServerEngine) => any } [onStart]
     * @memberof RpgServerEngineHooks
     */
    onStart?: (server: RpgServerEngine) => any

    /**
     *  At each server frame. Normally represents 60FPS
     * 
     * @prop { (engine: RpgServerEngine) => any } [onStep]
     * @memberof RpgServerEngineHooks
     */
    onStep?: (server: RpgServerEngine) => any

   /**
     * Flexible authentication function for RPGJS.
     * 
     * This `auth` function is an integral part of the connection process in RPGJS, designed to be agnostic 
     * and adaptable to various authentication systems. It is not tied to any specific database or third-party 
     * authentication service, allowing developers to implement custom logic suited to their game's requirements. 
     * This flexibility is particularly useful in MMORPGs where diverse and robust authentication mechanisms may be needed.
     *
     * The function is called during the player connection phase and should handle the verification of player credentials.
     * The implementation can vary widely based on the chosen authentication method (e.g., JWT tokens, OAuth, custom tokens).
     *
     * @param {RpgServerEngine} server - The instance of the game server.
     * @param {SocketIO.Socket} socket - The socket instance for the connecting player. This can be used to access client-sent data, like tokens or other credentials.
     * @returns {Promise<string> | string  | undefined} The function should return a promise that resolves to a player's unique identifier (e.g., user ID) if authentication is successful, or a string representing the user's ID. Alternatively, it can throw an error if authentication fails. If undefined is returned, the player id is generated.
     * @throws {string} Throwing an error will prevent the player from connecting, signifying a failed authentication attempt.
     *
     * @example
     * ```ts
     * // Example of a simple token-based authentication in main/server.ts
     * const server: RpgServerEngineHooks = {
     *     auth(server, socket) {
     *         const token = socket.handshake.query.token;
     *         // Implement your authentication logic here
     *         // Return user ID or throw an error if authentication fails
     *     }
     * };
     * ```
     */
    auth?: (server: RpgServerEngine, socket: any) => Promise<string> | string | never | undefined
}

export interface RpgPlayerHooks {
    /**
     *  Set custom properties on the player. Several interests:
     * 1. The property is shared with the client
     * 2. If you save with `player.save()`, the property will be saved to be reloaded later
     * 3. If you use horizontal scaling, the property will be kept in memory if the player changes the map and this map is on another server
     * 
     * Example:
     * 
     * ```ts
     * import { RpgPlayerHooks } from '@rpgjs/server'
     * 
     * declare module '@rpgjs/server' {
     *  export interface RpgPlayer {
     *      nbWood: number
     *  }
     * }
     * 
     * export const player: RpgPlayerHooks = {
     *  props: {
     *      nbWood: Number
     *  }
     * }
     * ```
     * 
     * This is a simple example. Let's say that the player can have a number of harvested woods, then 
     * 1. you must specify the type for Typescript
     * 2. Add the property in props
     * 
     * You can also set up with this object:
     * 
     * ```
     *  {
            $default: <any> (undefined by default), 
            $syncWithClient: <boolean> (true by default),
            $permanent: <boolean> (true by default)
        }
        ```
     * 
     * - Indicate if the property should be shared with the client
     * 
     * Example:
     * 
     * ```ts
     * export const player: RpgPlayerHooks = {
     *  props: {
     *      secretProp: {
     *          $syncWithClient: false
     *      }
     *  }
     * }
     * ```
     * 
     * - Indicate if the property should be registered in a database. If the data is just temporary to use on the current map:
     * 
     * ```ts
     * export const player: RpgPlayerHooks = {
     *  props: {
     *      tmpProp: {
     *          $permanent: false
     *      }
     *  }
     * }
     * ```
     * 
     * @prop {object} [props]
     * @since 3.0.0-beta.9
     * @memberof RpgPlayerHooks
     */
    props?: {
        [key: string]: any
    }

    /**
    *  When the player joins the map
    * 
    * @prop { (player: RpgPlayer, map: RpgMap) => any } [onJoinMap]
    * @memberof RpgPlayerHooks
    */
    onJoinMap?: (player: RpgPlayer, map: RpgMap) => any

    /**
    *  When the player is connected to the server
    * 
    * @prop { (player: RpgPlayer) => any } [onConnected]
    * @memberof RpgPlayerHooks
    */
    onConnected?: (player: RpgPlayer) => any

    /**
    *  When the player presses a key on the client side
    * 
    * @prop { (player: RpgPlayer, data: { input: Direction | Control | string, moving: boolean }) => any } [onInput]
    * @memberof RpgPlayerHooks
    */
    onInput?: (player: RpgPlayer, data: { input: Direction | Control | string, moving: boolean }) => any

    /**
    *  When the player leaves the map
    * 
    * @prop { (player: RpgPlayer, map: RpgMap) => any } [onLeaveMap]
    * @memberof RpgPlayerHooks
    */
    onLeaveMap?: (player: RpgPlayer, map: RpgMap) => any

    /**
    *  When the player increases one level
    * 
    * @prop { (player: RpgPlayer, nbLevel: number) => any } [onLevelUp]
    * @memberof RpgPlayerHooks
    */
    onLevelUp?: (player: RpgPlayer, nbLevel: number) => any

    /**
    *  When the player's HP drops to 0
    * 
    * @prop { (player: RpgPlayer) => any } [onDead]
    * @memberof RpgPlayerHooks
    */
    onDead?: (player: RpgPlayer) => any,

    /**
    *  When the player leaves the server
    * 
    * @prop { (player: RpgPlayer) => any } [onDisconnected]
    * @memberof RpgPlayerHooks
    */
    onDisconnected?: (player: RpgPlayer) => any

    /**
    *  When the player enters the shape
    * 
    * @prop { (player: RpgPlayer, shape: RpgShape) => any } [onInShape]
    * 3.0.0-beta.3
    * @memberof RpgPlayerHooks
    */
    onInShape?: (player: RpgPlayer, shape: RpgShape) => any

    /**
     *  When the player leaves the shape
     * 
     * @prop { (player: RpgPlayer, shape: RpgShape) => any } [onOutShape]
     * 3.0.0-beta.3
     * @memberof RpgPlayerHooks
     */
    onOutShape?: (player: RpgPlayer, shape: RpgShape) => any

    /**
    * When the x, y positions change
    * 
    * @prop { (player: RpgPlayer) => any } [onMove]
    * @since 3.0.0-beta.4
    * @memberof RpgPlayerHooks
    */
    onMove?: (player: RpgPlayer) => any

    /**
    * Allow or not the player to switch maps. `nexMap` parameter is the retrieved RpgMap class and not the instance
    * 
    * @prop { (player: RpgPlayer, nextMap: RpgClassMap<RpgMap>) =>  boolean | Promise<boolean> } [canChangeMap]
    * @since 3.0.0-beta.8
    * @memberof RpgPlayerHooks
    */
    canChangeMap?: (player: RpgPlayer, nextMap: RpgClassMap<RpgMap>) => boolean | Promise<boolean>
}

export interface RpgServer {
    /**
     * Add hooks to the player or engine. All modules can listen to the hook
     * 
     * @prop { { player: string[], engine: string[] } } [hooks]
     * @memberof RpgServer
     * @since 4.0.0
     * @stability 1
     * @example
     * 
     * ```ts
     * import { RpgServer, RpgModule } from '@rpgjs/server'
     * 
     * @RpgModule<RpgServer>({
     *     hooks: {
     *        player: ['onAuth']
     *    }
     * })
     * class RpgServerEngine { }
     * ```
     * 
     * Emit the hook:
     * 
     * ```ts
     * server.module.emit('server.player.onAuth', player)
     * ```
     * 
     * > When we issue a hook, it has to be in form:
     * > `<side>.<property>.<function>`
     * 
     * And listen to the hook:
     * 
     * ```ts
     * import { RpgPlayerHooks, RpgPlayer } from '@rpgjs/server'
     * 
     * const player: RpgPlayerHooks = {
     *    onAuth(player: RpgPlayer) {
     *       console.log('player is authenticated') 
     *   }
     * }
     * ```
     */
    hooks?: {
        player?: string[],
        engine?: string[]
    }
    /**
     * Adding sub-modules
     *
     * @prop { { client: null | Function, server: null | Function }[]} [imports]
     * @memberof RpgServer
     */
    imports?: ModuleType[]

    /**
     * Object containing the hooks concerning the engine
     * 
     * ```ts
     * import { RpgServerEngine, RpgServerEngineHooks, RpgModule, RpgClient } from '@rpgjs/server'
     * 
     * const engine: RpgEngineHooks = {
     *      onStart(server: RpgServerEngine) {
     *          console.log('server is started')
     *      }
     * }
     * 
     * @RpgModule<RpgServer>({
     *      engine
     * })
     * class RpgServerModule {}
     * ```
     * 
     * @prop {RpgServerEngineHooks} [engine]
     * @memberof RpgServer
     */
    engine?: RpgServerEngineHooks

    /** 
     * Give the `player` object hooks. Each time a player connects, an instance of `RpgPlayer` is created.
     * 
     * ```ts
     * import { RpgPlayer, RpgServer, RpgPlayerHooks, RpgModule } from '@rpgjs/server'
     * 
     * const player: RpgPlayerHooks = {
     *      onConnected(player: RpgPlayer) {
     *          
     *      }
     * }
     * 
     * @RpgModule<RpgServer>({
     *      player
     * })
     * class RpgServerEngine { } 
     * ``` 
     * 
     * @prop {RpgClassPlayer<RpgPlayer>} [player]
     * @memberof RpgServer
     * */
    player?: RpgPlayerHooks,

    /** 
     * References all data in the server. it is mainly used to retrieve data according to their identifier
     * 
     * ```ts
     * import { RpgServer, RpgModule } from '@rpgjs/server'
     * import { Potion } from 'my-database/items/potion'
     * 
     * @RpgModule<RpgServer>({
     *      database: {
     *          Potion
     *      }
     * })
     * class RpgServerEngine { } 
     * ``` 
     * 
     * @prop { { [dataName]: data } } [database]
     * @memberof RpgServer
     * */
    database?: object | any[],

    /** 
     * Array of all maps. Each element is an `RpgMap` class
     * 
     * ```ts
     * import { RpgMap, MapData, RpgServer, RpgModule } from '@rpgjs/server'
     * 
     * @MapData({
     *      id: 'town',
     *      file: require('./tmx/mymap.tmx'),
     *      name: 'Town'
     * })
     * class TownMap extends RpgMap { }
     * 
     * @RpgModule<RpgServer>({
     *      maps: [
     *          TownMap
     *      ]
     * })
     * class RpgServerEngine { } 
     * ``` 
     * 
     * It is possible to just give the object as well
     * 
     * ```ts
     * @RpgModule<RpgServer>({
     *      maps: [
     *          {
     *              id: 'town',
     *              file: require('./tmx/mymap.tmx'),
     *              name: 'Town'
     *          }
     *      ]
     * })
     * class RpgServerEngine { } 
     * ``` 
     * 
     * Since version 3.0.0-beta.8, you can just pass the path to the file. The identifier will then be the name of the file
     * 
     *  ```ts
     * @RpgModule<RpgServer>({
     *      maps: [
     *          require('./tmx/mymap.tmx') // id is "mymap"
     *      ]
     * })
     * class RpgServerEngine { } 
     * ``` 
     * 
     * @prop {RpgClassMap<RpgMap>[]} [maps]
     * @memberof RpgServer
     * */
    maps?: RpgClassMap<RpgMap>[] | MapOptions[] | string[] | TiledMap[],

    /**
     * Array of all events. Each element is an `RpgEvent` class
     * Events can be used by placing a shape with the name of the event on Tiled Map Editor
     * 
     * @prop {RpgClassEvent<RpgEvent>[]} [events]
     * @since 4.0.0
     * @memberof RpgServer
     */
    events?: RpgClassEvent<RpgEvent>[]

    /**
     * Loads the content of a `.world` file from Tiled Map Editor into the map scene
     * 
     * > Note, that if the map already exists (i.e. you have already defined an RpgMap), the world will retrieve the already existing map. Otherwise it will create a new map
     * 
     * @prop {object[]} [worldMaps]
     * object is 
     * ```ts
     * {
     *  id?: string
     *  maps: {
     *      id?: string
     *      properties?: object
     *      fileName: string;
            height: number;
            width: number;
            x: number;
            y: number;
     *  }[],
        onlyShowAdjacentMaps: boolean, // only for Tiled Map Editor
        type: 'world' // only for Tiled Map Editor
     * }
     * ```
     * @since 3.0.0-beta.8
     * @example
     * ```ts
     * import myworld from 'myworld.world'
     * 
     * @RpgModule<RpgServer>({
     *      worldMaps: [
     *          myworld
     *      ]
     * })
     * class RpgServerEngine { } 
     * ```
     * @memberof RpgServer
     */
    worldMaps?: WorldMap[]


    /** 
     * Combat formula used in the method player.applyDamage(). There are already formulas in the RPGJS engine but you can customize them
     *  
     * ```ts
     * damageFormulas: {
     *      damageSkill: (a, b, skill) => number,
     *      damagePhysic: (a, b) => number,
     * 
     *      // damage: the damages calculated from the previous formulas
     *      damageCritical: (damage, a, b) => number
     *      coefficientElementsa : (a, b, bDef) => number
     * }
     * ```
     * 
     * `a` represents the attacker's parameters
     * `b` represents the defender's parameters
     * 
     * Example:
     * 
     * ```ts
     * import { RpgModule, RpgServer, Presets } from '@rpgjs/server'
     * 
     * const { ATK, PDEF } = Presets
     * 
     * @RpgModule<RpgServer>({
     *      damageFormulas: {
     *          damagePhysic(a, b) {
     *              let damage = a[ATK] - b[PDEF]
     *              if (damage < 0) damage = 0
     *              return damage
     *          }
     *      }
     * })
     * class RpgServerEngine { } 
     * ```
     * @prop {object} damageFormulas
     * @memberof RpgServer
     * */
    damageFormulas?: {
        damageSkill?: (a, b, skill) => number,
        damagePhysic?: (a, b) => number,
        damageCritical?: (damage, a, b) => number
        coefficientElements?: (a, b, bDef) => number
    }

    scalability?: {
        matchMaker: MatchMakerOption,
        stateStore: IStoreState
        hooks: {
            onConnected(store: IStoreState, matchMaker: RpgMatchMaker, player: RpgPlayer): Promise<boolean> | boolean
            doChangeServer(store: IStoreState, matchMaker: RpgMatchMaker, player: RpgPlayer): Promise<boolean> | boolean
        }
    }
}
