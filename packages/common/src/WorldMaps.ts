import RBush from 'rbush'
import { TiledWorldMap } from '@rpgjs/tiled'
import { RpgCommonMap } from './Map'
import { Direction } from './Player'

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

export class RpgCommonWorldMaps {
    private mapsTree: RBush = new RBush(500)
    private maps: Map<string, RpgTiledWorldMap> = new Map()

    constructor(public id: string) {}

    addMap(wordMapInfo: RpgTiledWorldMap, map: RpgClassMap<RpgCommonMap>) {
        const { x, y, height, width } = wordMapInfo
        map.prototype.worldMapParent = this
        this.maps.set(map.id as string, wordMapInfo)
        this.mapsTree.insert({
            minX: x,
            minY: y,
            maxX: x + width,
            maxY: y + height,
            map
        })
    }

    getMapInfo(id: string): RpgTiledWorldMap | undefined {
        return this.maps.get(id)
    }

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