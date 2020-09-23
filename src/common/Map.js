import SAT from 'sat'

const buffer = new Map()

export default class RpgCommonMap {

    static get buffer() {
        return buffer
    }

    load(data) {
        this.data = data
        this.width = data.width
        this.tileWidth = data.tileWidth 
        this.tileHeight = data.tileHeight
        this.height = data.height
        this.layers = data.layers
        this.shapes = data.shapes
        this._extractShapes()
    }

    get widthPx() {
        return this.width * this.tileWidth
    }

    get heightPx() {
        return this.height * this.tileHeight
    }

    _extractShapes() {
        this.shapes = []
        for (let layer of this.layers) {
            if (layer.type != 'object') continue
            for (let obj of layer.objects) {
                let hitbox, type
                if (obj.ellipse) {
                    type = 'circle'
                    hitbox = new SAT.Circle(new SAT.Vector(obj.x, obj.y), obj.width)
                }
                else if (obj.polygon) {
                    type = 'polygon'
                    hitbox = new SAT.Polygon(new SAT.Vector(obj.x, obj.y), obj.polygon.map(pos => new SAT.Vector(pos.x, pos.y)))
                }
                else if (!obj.polygon && obj.width > 0 && obj.height > 0) {
                    type = 'box'
                    hitbox = new SAT.Box(new SAT.Vector(obj.x, obj.y), obj.width, obj.height)
                }
                if (!hitbox) continue
                this.shapes.push({ 
                    properties: obj.properties,
                    hitbox,
                    type
                })
            }
        }
    }

    getTileIndex(x, y) {
        return this.width * Math.floor(y / this.tileHeight) + Math.floor(x / this.tileWidth)
    }

    getTileByIndex(tileIndex) {
        const tiles = []
        const objects = []
        let hasColission = false
        for (let layer of this.layers) {
            if (layer.type != 'tile') {
                continue
            }
            const _tiles = layer.tiles[tileIndex]
            tiles.push(_tiles)
            if (!hasColission && _tiles && _tiles.properties) {
                hasColission = _tiles.properties.collision
            }
        }
        return {
            tiles,
            hasColission
        }
    }

    getTileByPosition(x, y) {
        const tileIndex = this.getTileIndex(x, y)
        return this.getTileByIndex(tileIndex)
    }

}
