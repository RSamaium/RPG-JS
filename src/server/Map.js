import tmx from 'tmx-parser'
import Map from '../common/Map';


export default class RpgMap {
    constructor(server, options) {
        this.filename = options.tilemap
        this.id = options.id
        this.server = server
    }

    async load() {
        if (Map.buffer.has(this.id)) return
        const map = await this.parseFile() 
        for (let layer of map.layers) {
            delete layer.map
        }
        map.id = this.id
        this.server.createRoom(this.id)
        Map.buffer.set(this.id, map)
       // const mapObject = this.server.game.setMap(map)
       // this.server.assignObjectToRoom(mapObject, this.id)
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