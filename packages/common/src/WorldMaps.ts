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

    getAdjacentMaps(map: RpgCommonMap, search: PositionBox | Direction): RpgClassMap<RpgCommonMap>[] {
        let position: PositionBox = {} as PositionBox
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
                // case Direction.Up:
                //     position = {
                //         minX: map.worldX,
                //         maxX: map.worldX + map.width,
                //         minY: map.worldY,
                //         maxY: map.worldY + map.height
                //     }
                //     break;
                default:
                    break;
            }
            
        }
        else {
            position = search
        }
        const result = this.mapsTree.search(position)
        return result.map(ret => ret.map)
    }
}