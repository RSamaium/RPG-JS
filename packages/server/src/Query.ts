import RpgPlayer from './Player'

export class Query {

    static Worlds

    private players: RpgPlayer[] = []

    constructor() {
        if (!Query.Worlds) {
            throw new Error('You have to start the RPG server before using the requests.')
        }
    }

    getPlayer(player): RpgPlayer {
        return Query.Worlds.getObject(player)
    }

    inMapOf(player: RpgPlayer) {
        const { map } = player
        this.players = Query.Worlds.getObjectsOfGroup(map)
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