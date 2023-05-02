import { World } from 'simple-room'
import { RpgShape, Utils } from '@rpgjs/common'
import { RpgPlayer } from './Player/Player'
import { Observable } from 'rxjs'

const { isString } = Utils

class QueryClass {
    /** 
     * Listen to the changes on all the rooms
     * 
     * ```ts
     * import { RpgWorld } from '@rpgjs/server'
     * import { map } from 'rxjs/operators' // install rxjs
     * 
     * RpgWorld.changes
     *  .pipe(
     *      map(rooms => rooms['mymap'])
     *  )
     *  .subscribe((room) => {
     *      const users: any = Object.values(room.users)
     *      console.log(users)
     *  })
     * ``` 
     * 
     * @title Subscribe to the world
     * @prop {Observable} RpgWorld.changes
     * @memberof RpgWorld
     * */
    get changes(): Observable<any> {
        return World.changes.asObservable() as any
    }

    /**
     * Retrieve a player according to his ID
     * 
     * ```ts
     * import { RpgWorld } from '@rpgjs/server'
     * 
     * const player = RpgWorld.getPlayer(player) // player is RpgPlayer (player.id) or string (id)
     * ```
     * 
     * @title Get Player
     * @method RpgWorld.getPlayer(player)
     * @param {RpgPlayer | string} player identifier
     * @returns {RpgPlayer}
     * @memberof RpgWorld
     */
    getPlayer(player: RpgPlayer | string): RpgPlayer {
        const id: any = isString(player) ? player : '' + (player as RpgPlayer).id
        const _player: any = World.getUser(id)
        return _player as RpgPlayer
    }

    /**
     * Recover all the players of the game
     * 
     * ```ts
     * import { RpgWorld } from '@rpgjs/server'
     * 
     * const players = RpgWorld.getPlayers()
     * ```
     * 
     * @title Get all Players
     * @method RpgWorld.getPlayers()
     * @returns {Array<RpgPlayer>}
     * @memberof RpgWorld
     */
    getPlayers(): RpgPlayer[] {
        const users: any = World.getUsers()
        const array = Object.values(users) as RpgPlayer[]
        return array.map((user: RpgPlayer) => this.getPlayer(user))
    }

    /**
     * Recover all map objects: players and events. If you specify the `player` parameter, it also retrieves the events in scenario mode of the player in question
     * 
     * ```ts
     * import { RpgWorld } from '@rpgjs/server'
     * 
     * const objects = RpgWorld.getObjectsOfMap('mapname')
     * console.log(objects)
     * ```
     * 
     * Also retrieve events in Scenario mode:
     * 
     * ```ts
     * import { RpgWorld } from '@rpgjs/server'
     * 
     * const objects = RpgWorld.getObjectsOfMap('mapname', 'playerid')
     * ```
     * 
     * @title Get all objects of map
     * @method RpgWorld.getObjectsOfMap(map,playerId?)
     * @param {string} map Map Name
     * @param {RpgPlayer | string} playerId player identifier
     * @returns {Array<RpgPlayer>}
     * @memberof RpgWorld
     */
    getObjectsOfMap(map: string, playerId?: RpgPlayer | string): RpgPlayer[] {
        return Object.values(this._getObjectsOfMap(map, playerId)) as RpgPlayer[]
    }

    _getObjectsOfMap(map: string, playerId?: RpgPlayer | string): { [id: string]: RpgPlayer } {
        const room: any = World.getRoom(map)
        let player: any = null
        if (playerId) {
            player = this.getPlayer(playerId)
        }
        return {
            ...room.users,
            ...room.events,
            ...(player ? player.events : {})
        }
    }

    /**
     * Find all the shapes of the map
     * 
     * ```ts
     * import { RpgWorld } from '@rpgjs/server'
     * 
     * const shapes = RpgWorld.getShapesOfMap('mapname')
     * console.log(shapes)
     * ```
     * 
     * @title Get all shapes of map
     * @method RpgWorld.getShapesOfMap(map)
     * @param {string} map Map Name
     * @returns {Array<RpgShape>}
     * @memberof RpgWorld
     */
    getShapesOfMap(map: string): RpgShape[] {
        return Object.values(this._getShapesOfMap(map))
    }

    _getShapesOfMap(map: string): { [id: string]: RpgShape } {
        const room: any = World.getRoom(map)
        return room.shapes
    }

    // TODO
    getRooms<T>(): Map<string, T> {
        return World.getRooms() as Map<string, T>
    }

    getRoom<T>(name: string): T {
        return World.getRoom(name) as T
    }

    /**
     * Recover all the players of a map
     * 
     * ```ts
     * import { RpgWorld } from '@rpgjs/server'
     * 
     * const players = RpgWorld.getPlayersOfMap('mapname')
     * ```
     * 
     * @title Get all Players a map
     * @method RpgWorld.getPlayersOfMap(map)
     * @param {string} map Map Name
     * @returns {Array<RpgPlayer>}
     * @memberof RpgWorld
     */
    getPlayersOfMap(map: string): RpgPlayer[] {
        const room: any = World.getRoom(map)
        return Object.values(room.users) as RpgPlayer[]
    }
}

export const Query = new QueryClass()