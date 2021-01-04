import { RpgPlayer } from './Player/Player'
import { World } from '@rpgjs/sync-server'

class QueryClass {

    worlds

    private players: RpgPlayer[] = []

   /* constructor() {
        if (!Query.Worlds) {
            throw new Error('You have to start the RPG server before using the requests.')
        }
    }*/

    getPlayer(player): RpgPlayer {
        return Query.worlds.getObject(player)
    }

    getPlayersOfMap(map: string): RpgPlayer[] {
        const room: any = World.getRoom(map)
        return Object.values(room.users) as RpgPlayer[]
    }

    inMapOf(player: RpgPlayer) {
        const { map } = player
        this.players = Query.worlds.getObjectsOfGroup(map)
        return this
    }

    filter(cb) {
        this.players = this.players.filter(cb)
        return this
    }

    find() {
       return this.players
    }

    fineOne() {
        return this.players[0]
    }

}

export const Query = new QueryClass()