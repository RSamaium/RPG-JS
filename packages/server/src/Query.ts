import { World } from '@rpgjs/sync-server'
import { Utils } from '@rpgjs/common'
import { RpgPlayer } from './Player/Player'

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
    get changes(): any {
        return World.changes.asObservable()
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
     * @param {RpgPlayer | string} player spritesheet identifier
     * @returns {RpgPlayer}
     * @memberof RpgWorld
     */
    getPlayer(player: RpgPlayer | string): RpgPlayer {
        const id: any = isString(player) ? player : ''+(player as RpgPlayer).id
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
        return Object.values(users) as RpgPlayer[]
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