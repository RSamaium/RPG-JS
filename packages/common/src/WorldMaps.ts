import RBush from 'rbush'
import { TiledWorldMap } from '@rpgjs/tiled'
import { RpgCommonMap } from './Map'
import { Direction } from '@rpgjs/types'

export interface RpgClassMap<T> {
    id?: string
    new (server: any): T,
}

export interface RpgTiledWorldMap extends TiledWorldMap{
    properties?: {
        [key: string]: any
    }
}

type PositionBox = { minX: number, minY: number, maxX: number, maxY: number }
type MapTree = { map: RpgClassMap<RpgCommonMap> } & PositionBox

export class RpgCommonWorldMaps {
    private mapsTree: RBush = new RBush(500)
    private maps: Map<string, RpgTiledWorldMap> = new Map()

    constructor(public id: string) {}

    /**
     * Adding information from the map to the world
     *
     * > Maximum maps in world: 500
     * 
     * @title Add Map in world
     * @method world.addMap(wordMapInfo,map)
     * @param {object} wordMapInfo 
     * Object file:
     * ```ts
     * {
     *  fileName: string;
        height: number;
        width: number;
        x: number;
        y: number;
     * }
        ```
        `fileName` represents a file to the JSON file (TMX transformed) or directly the Tiled Map Editor object
     * 
     * @param {class of RpgMap} map 
     * @since 3.0.0-beta.8
     * @memberof RpgWorldMaps
     */
    addMap(wordMapInfo: RpgTiledWorldMap, map: RpgClassMap<RpgCommonMap>) {
        const { x, y, height, width } = wordMapInfo
        map.prototype.worldMapParent = this
        this.maps.set(map.id as string, wordMapInfo)
        this.mapsTree.insert<MapTree>({
            minX: x,
            minY: y,
            maxX: x + width,
            maxY: y + height,
            map
        })
    }

    updateMap(mapId: string, wordMapInfo: RpgTiledWorldMap): boolean {
        const map = this.maps.get(mapId)
        if (map) {
            const item = (this.mapsTree.all() as MapTree[]).find(item => item.map.id == mapId)
            if (!item) return false
            this.maps.set(mapId, wordMapInfo)
            item.map.prototype.worldMapParent = this
            item.minX = wordMapInfo.x
            item.minY = wordMapInfo.y
            item.maxX = wordMapInfo.x + wordMapInfo.width
            item.maxY = wordMapInfo.y + wordMapInfo.height
            return true
        }
        return false
    }

    /**
     * Remove map of the world
     * @title Remove map of the world
     * @method world.removeMap(mapId)
     * @param {string} mapId 
     * @returns {boolean}
     * @since 3.0.0-beta.8
     * @memberof RpgWorldMaps
     */
    removeMap(mapId: string): boolean {
        const map = this.maps.get(mapId)
        if (map) {
            const item = (this.mapsTree.all() as MapTree[]).find(item => item.map.id == mapId)
            if (!item) return false
            this.maps.delete(mapId)
            item.map.prototype.worldMapParent = undefined
            this.mapsTree.remove(item)
            return true
        }
        return false
    }

    removeAllMaps() {
        this.maps.forEach((map, id) => {
            this.removeMap(id)
        })
    }

    /**
     * Retrieve information from the world
     * 
     * @title Retrieve information from the world
     * @method world.getMapInfo(id)
     * @param {string} id map id
     * @return {RpgTiledWorldMap | undefined}
     * {
     *  id?: string
     *  properties?: object
     *  fileName: string;
        height: number;
        width: number;
        x: number;
        y: number;
     * }
     * @since 3.0.0-beta.8
     * @memberof RpgWorldMaps
     */
    getMapInfo(id: string): RpgTiledWorldMap | undefined {
        return this.maps.get(id)
    }

    /**
     * Retrieves neighboring maps according to positions or direction
     * 
     * @title Retrieves neighboring maps
     * @method world.getAdjacentMaps(map,search)
     * @param {RpgMap} map The source map. We want to find the neighboring maps of the source map
     * @param { PositionBox | Direction | { x: number, y: number } } search Research method
     *  * PositionBox. An object of the following form:
     *  `{ minX: number, minY: number, maxX: number, maxY: number }`
     *  * Direction. Collect all the maps in the given direction (e.g. the maps at the top)
     *  * Point: { x: number, y: number }
     * @return { {class of RpgMap}[] }
     * @since 3.0.0-beta.8
     * @example
     * ```ts
     * world.getAdjacentMaps(mymap, Direction.Up) // returns [class of RpgMap]
     * ```
     * @memberof RpgWorldMaps
     */
    getAdjacentMaps(map: RpgCommonMap, search: PositionBox | Direction | { x: number, y: number }): RpgClassMap<RpgCommonMap>[] {
        let position: PositionBox = {} as PositionBox
        const point = search as { x: number, y: number }
        if (typeof search == 'number') {
            const padding = 1
            switch (search) {
                case Direction.Up:
                    position = {
                        minX: map.worldX + padding,
                        maxX: map.worldX + map.widthPx - padding,
                        minY: map.worldY - padding - 1,
                        maxY: map.worldY - padding 
                    }
                    break;
                case Direction.Right:
                    position = {
                        minX: map.worldX + map.widthPx + padding,
                        maxX: map.worldX + map.widthPx + padding + 1,
                        minY: map.worldY + padding,
                        maxY: map.worldY + map.heightPx - padding
                    }
                    break;
                case Direction.Down:
                    position = {
                        minX: map.worldX + padding,
                        maxX: map.worldX + map.widthPx - padding,
                        minY: map.worldY + map.heightPx + padding,
                        maxY: map.worldY + map.heightPx + padding + 1
                    }
                    break;
                case Direction.Left:
                    position = {
                        minX: map.worldX - padding,
                        maxX: map.worldX - padding - 1,
                        minY: map.worldY + padding,
                        maxY: map.worldY + map.heightPx - padding
                    }
                    break;
            }
            
        }
        else if (point.x) {
            position = {
                minX: point.x,
                maxX: point.x,
                minY: point.y,
                maxY: point.y
            }
        }
        else {
            position = search as PositionBox
        }
        const result = this.mapsTree.search(position)
        return result.map(ret => ret.map)
    }
}