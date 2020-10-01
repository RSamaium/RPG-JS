class Query {

    private _players = []

    /*constructor(player) {
        this.players = []
        this._command = new Command()
        this.getPlayer(player)
    }

    get command() {
        return this._command._setPlayers(this.players)
    }

    getPlayer(player) {
        this.players.push(player)
    }

    _getMap(id) {
        return Map.buffer.get(id) 
    }*/

    constructor() {
        this._players = []
    }

    find() {
        //const players = this._server.game.world.forEachObject(console.log)
        return []
    }

    fineOne() {

    }

    exec() {
        return this._players
    }

}

export default new Query()