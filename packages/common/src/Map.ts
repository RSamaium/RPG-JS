import { HitObject } from './Hit'
import { random, intersection, generateUID } from './Utils'
import { RpgShape } from './Shape'

const buffer = new Map()

interface TileInfo {
    tiles: any[]
    hasCollision: boolean
    isClimbable?: boolean
    isOverlay: boolean
    objectGroups: HitObject[]
}

export default class RpgCommonMap {

    data: any
    width: number = 0
    height: number = 0
    tileWidth: number = 0
    tileHeight: number = 0
    layers: any[] = []
    private shapes: RpgShape[] = []

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
        this._extractShapes()
    }

    get widthPx() {
        return this.width * this.tileWidth
    }

    get heightPx() {
        return this.height * this.tileHeight
    }

    get zTileHeight() {
        return this.tileHeight
    }

    _extractShapes() {
        for (let layer of this.layers) {
            if (layer.type != 'object') continue
            for (let obj of layer.objects) {
                this.createShape(obj)
            }
        }
    }

    /**
     * Create a shape dynamically on the map
     * 
     * Object:
     *  - (number) x: Position X
     *  - (number) y: Position Y
     *  - (number) width: Width
     *  - (number) height: Height
     *  - (object) properties (optionnal): 
     *      - (number) z: Position Z
     *      - (hexadecimal) color: Color (shared with client)
     *      - (boolean) collision
     *      - You can your own properties
     * 
     * @title Create Shape
     * @since beta.3
     * @method map.createShape(obj)
     * @returns {RpgShape}
     * @memberof Map
     */
    createShape(obj: HitObject): RpgShape {
        obj.name = (obj.name || generateUID()) as string
        obj.properties = obj.properties || {}
        const shape = new RpgShape(obj)
        this.shapes.push(shape)
        // trick to sync with client
        return this.shapes[this.shapes.length-1]
    }

    removeShape(name: string) {
        // TODO: out players after delete shape
        this.shapes = this.shapes.filter(shape => shape.name != name)
    }

    getShapes(): RpgShape[] {
        return this.shapes
    }

    getShape(name: string): RpgShape | undefined {
        return this.shapes.find(shape => shape.name == name)
    }
    
    getPositionByShape(filter): { x: number, y: number, z: number } | null {
        const startsFind = this.getShapes().filter(filter)
        if (startsFind.length) {
            const start = startsFind[random(0, startsFind.length-1)]
            return { x: start.hitbox.x, y: start.hitbox.y, z: start.properties.z * this.zTileHeight || 0 }
        }
        return null
    }

    getTileIndex(x, y, [z]): number {
        return this.width * Math.floor((y - z) / this.tileHeight) + Math.floor(x / this.tileWidth)
    }

    getTileByIndex(tileIndex, zPlayer): TileInfo {
        const tiles: any[] = []
        for (let layer of this.layers) {
            if (layer.type != 'tile') {
                continue
            }
            const _tiles = layer.tiles[tileIndex]
            if (!_tiles) {
                continue
            }
            const zLayer = layer.properties.z
            const zTile = _tiles.properties.z
            let z, zIntersection
            if (zLayer !== undefined) {
                z = zLayer + (zTile !== undefined ? zTile : 0)
            }
            else if (zTile !== undefined) {
                z = zTile
            }
            if (z !== undefined) {
                const realZ = z * this.tileHeight
                zIntersection = intersection(zPlayer, [realZ, realZ + this.tileHeight])
            }
            if (zIntersection !== undefined) {
                if (zIntersection) tiles.push(_tiles)
            }
            else {
                tiles.push(_tiles)
            }
        }
        const getLastTile = tiles[tiles.length-1]
        if (!getLastTile) {
            return {
                tiles,
                hasCollision: true,
                isOverlay: false,
                objectGroups: []
            }
        }
        const hasCollision = getLastTile.properties.collision
        const isOverlay = getLastTile.properties.overlay
        const isClimbable = getLastTile.properties.climb
        const objectGroups = getLastTile.objectGroups
        return {
            tiles,
            hasCollision,
            isOverlay,
            objectGroups,
            isClimbable
        }
    }

    getTileOriginPosition(x, y): {
        x: number
        y: number
    } {
        return { 
            x: Math.floor(x / this.tileWidth) * this.tileWidth,
            y: Math.floor(y / this.tileHeight) * this.tileHeight
        }
    }

    getTileByPosition(x, y, z): TileInfo {
        const tileIndex = this.getTileIndex(x, y, z)
        return this.getTileByIndex(tileIndex, z)
    }

}
