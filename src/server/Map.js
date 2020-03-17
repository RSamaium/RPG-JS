import tmx from 'tmx-parser'

export default class Map {
    constructor(server, options) {
        this.filename = options.tilemap
        this.id = options.id
        this.server = server
    }

    async load() {
        const map = await this.parseFile() 
        for (let layer of map.layers) {
            delete layer.map
        }
        this.server.createRoom(this.id)
       // const mapObject = this.server.game.setMap(map)
       // this.server.assignObjectToRoom(mapObject, this.id)
       return map
    }

    parseFile() {
        return new Promise((resolve, reject) => {
            tmx.parseFile(this.filename, (err, map) => {
                if (err) return reject(err)
                resolve(map)
            })
        })
    }
}