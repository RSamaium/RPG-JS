import { ModuleType } from '@rpgjs/common'
import { RpgPlayer } from './Player/Player'
import { RpgMap } from './Game/Map'

interface RpgClassMap<T> {
    new (server: any): T,
}

export interface RpgPlayerHooks {
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
     * @prop { (player: RpgPlayer, data: { input: any }) => any } [onInput]
     * @memberof RpgPlayerHooks
     */
    onInput?: (player: RpgPlayer, data: { input: any }) => any

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
     * @stability 1
     * @memberof RpgPlayerHooks
     */
    onLevelUp?: (player: RpgPlayer, nbLevel: number) => any

     /**
     *  When the player's HP drops to 0
     * 
     * @prop { (player: RpgPlayer) => any } [onDead]
     * @stability 1
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
}

export interface RpgServer { 

    /**
     * Adding sub-modules
     *
     * @prop { { client: null | Function, server: null | Function }[]} [imports]
     * @memberof RpgServer
     */
    imports?: ModuleType[]

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
    database?: object,

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
     * @prop {RpgClassMap<RpgMap>[]} [maps]
     * @memberof RpgServer
     * */
    maps?: RpgClassMap<RpgMap>[],

    
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
}
