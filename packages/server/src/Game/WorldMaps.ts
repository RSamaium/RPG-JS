import { RpgCommonWorldMaps, Utils } from '@rpgjs/common'
import { TiledWorld, TiledMap } from '@rpgjs/tiled'
import { SceneMap } from '../Scenes/Map'

export interface WorldMap extends TiledWorld {
    id?: string,
    fileName: string | TiledMap
}

export class RpgWorldMaps extends RpgCommonWorldMaps {
    load(world: WorldMap, sceneMap: SceneMap) {
        for (let worldMap of world.maps) {
            const { fileName } = worldMap
            let id, map
            if (Utils.isString(fileName)) {
                id = Utils.extractId(fileName)
            }
            const create = () => sceneMap.createDynamicMap(fileName, this)
            if (!id) {
                map = create()
            }
            else {
                map = sceneMap.getMapBydId(id) ?? create()
            }
            this.addMap(map, worldMap)
        }
        return this
    }
}