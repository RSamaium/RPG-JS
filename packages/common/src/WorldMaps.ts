import RBush from 'rbush'
import { TiledWorldMap } from '@rpgjs/tiled'
import { RpgCommonMap } from './Map'

export class RpgCommonWorldMaps {
    private maps: RBush = new RBush(500)

    constructor(public id: string) {}

    addMap<RpgMap extends RpgCommonMap>(map: RpgMap, wordMapInfo: TiledWorldMap): RpgMap {
        const { x, y, height, width } = wordMapInfo
        this.maps.insert({
            minX: x,
            minY: y,
            maxX: x + width,
            maxY: y + height,
            map
        })
        return map
    }
}