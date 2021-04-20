import { Plugin } from '@rpgjs/common'
import { RpgPlayer } from './Player/Player'
import { RpgMap } from './Game/Map'

interface RpgClassPlayer<T> {
    new (gamePlayer: any, options: any, props: any): T,
}

interface RpgClassMap<T> {
    new (server: any): T,
}

interface RpgServerOptions { 

    /**
     * Add server-side plugins
     * 
     * @todo
     * @prop { { client: null | Function, server: null | Function }[]} [plugins]
     * @memberof RpgServer
     */
    plugins?: Plugin[]

    /** 
     * Give the `RpgPlayer` class. Each time a player connects, an instance of `RpgPlayer` is created.
     * 
     * ```ts
     * import { RpgPlayer, RpgServer, RpgServerEngine } from '@rpgjs/server'
     * 
     * class Player extends RpgPlayer {
     *      onConnected() {
     *          console.log('connected')
     *      }
     * }
     * 
     * @RpgServer({
     *      basePath: __dirname,
     *      playerClass: Player
     * })
     * class RPG extends RpgServerEngine { } 
     * ``` 
     * 
     * @prop {RpgClassPlayer<RpgPlayer>} [playerClass]
     * @memberof RpgServer
     * */
    playerClass?: RpgClassPlayer<RpgPlayer>,

    /** 
     * References all data in the server. it is mainly used to retrieve data according to their identifier
     * 
     * ```ts
     * import { RpgServer, RpgServerEngine } from '@rpgjs/server'
     * import { Potion } from 'my-database/items/potion'
     * 
     * @RpgServer({
     *      basePath: __dirname,
     *      database: {
     *          Potion
     *      }
     * })
     * class RPG extends RpgServerEngine { } 
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
     * import { RpgMap, MapData, RpgServer, RpgServerEngine } from '@rpgjs/server'
     * 
     * @MapData({
     *      id: 'town',
     *      file: require('./tmx/mymap.tmx'),
     *      name: 'Town'
     * })
     * class TownMap extends RpgMap { }
     * 
     * @RpgServer({
     *      basePath: __dirname,
     *      maps: [
     *          TownMap
     *      ]
     * })
     * class RPG extends RpgServerEngine { } 
     * ``` 
     * 
     * @prop {RpgClassMap<RpgMap>[]} [maps]
     * @memberof RpgServer
     * */
    maps?: RpgClassMap<RpgMap>[],

    /** 
     * It allows you to know where the maps are located. Usually put `__dirname` for the current directory.
     * 
     * ```ts
     * basePath: __dirname
     * ``` 
     * 
     * @prop {string} basePath
     * @memberof RpgServer
     * */
    basePath: string,

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
     * import { RpgServer, RpgServerEngine, Presets } from '@rpgjs/server'
     * 
     * const { ATK, PDEF } = Presets
     * 
     * @RpgServer({
     *      basePath: __dirname,
     *      damageFormulas: {
     *          damagePhysic(a, b) {
     *              let damage = a[ATK] - b[PDEF]
     *              if (damage < 0) damage = 0
     *              return damage
     *          }
     *      }
     * })
     * class RPG extends RpgServerEngine { } 
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

export function RpgServer(options: RpgServerOptions) {
    return (target) => {
        target._options = {}
        for (let key in options) {
            target._options[key] = options[key]
        }
    }
}