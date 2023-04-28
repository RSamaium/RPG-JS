import { RpgCommonWorldMaps, Utils } from '@rpgjs/common'
import { TiledWorld, TiledMap, TiledWorldMap } from '@rpgjs/tiled'
import { RpgClassMap, SceneMap } from '../Scenes/Map'
import { RpgMap } from './Map'

export type RpgTiledWorldMap = {
    id?: string
    fileName: string | TiledMap
} & TiledWorldMap

export type RpgTiledWorld  = {
    maps: RpgTiledWorldMap[]
} & TiledWorld

export interface WorldMap extends RpgTiledWorld {
    id?: string,
    basePath?: string
}

export class RpgWorldMaps extends RpgCommonWorldMaps {
    load(world: WorldMap, sceneMap: SceneMap) {
        for (let worldMap of world.maps) {
            const { fileName } = worldMap
            let id, map: RpgClassMap<RpgMap>
            if (worldMap.id) {
                id = worldMap.id
            }
            else if (Utils.isString(fileName)) {
                id = Utils.extractId(fileName)
            }
            const create = () => sceneMap.createDynamicMap({
                id,
                file: world.basePath ? `${world.basePath}/${fileName}` : fileName
            })
            if (!id) {
                map = create()
            }
            else {
                map = sceneMap.getMapBydId(id) ?? create()
            }
            this.addMap(worldMap, map)
        }
        return this
    }
}