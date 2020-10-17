import SAT from 'sat'
import { random } from './Utils'

const buffer = new Map()

export default class RpgCommonMap {

    data: any
    width: number = 0
    height: number = 0
    tileWidth: number = 0
    tileHeight: number = 0
    layers: any[] = []
    shapes: any[] = []

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
                else {
                    hitbox = new SAT.Vector(obj.x, obj.y)
                    type = obj.type
                }
                this.shapes.push({ 
                    properties: obj.properties,
                    hitbox,
                    type,
                    name: obj.name
                })
            }
        }
    }
    
    getPositionByShape(filter): { x: number, y: number } | null {
        const startsFind = this.shapes.filter(filter)
        if (startsFind.length) {
            const start = startsFind[random(0, startsFind.length-1)]
            return { x: start.hitbox.x, y: start.hitbox.y }
        }
        return null
    }

    getTileIndex(x, y): number {
        return this.width * Math.floor(y / this.tileHeight) + Math.floor(x / this.tileWidth)
    }

    getTileByIndex(tileIndex) {
        const tiles: any[] = []
        const objects = []
        let hasColission = false
        let isOverlay = false
        for (let layer of this.layers) {
            if (layer.type != 'tile') {
                continue
            }
            const _tiles = layer.tiles[tileIndex]
            if (_tiles) {
                if (!hasColission &&  _tiles.properties) {
                    hasColission = _tiles.properties.collision
                }
                else {
                    hasColission = false
                }
                if (!isOverlay &&  _tiles.properties) {
                    isOverlay = _tiles.properties.overlay
                }
                else {
                    isOverlay = false
                }
                tiles.push(_tiles)
            }
        }
        return {
            tiles,
            hasColission,
            isOverlay
        }
    }

    getTileByPosition(x, y) {
        const tileIndex = this.getTileIndex(x, y)
        return this.getTileByIndex(tileIndex)
    }

}
