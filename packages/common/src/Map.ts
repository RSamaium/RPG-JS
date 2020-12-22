import { Hit, HitObject } from './Hit'
import { random, intersection } from './Utils'

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
                this.shapes.push(Hit.getHitbox(obj))
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
