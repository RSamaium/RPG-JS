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
    id?: string
}

export class RpgWorldMaps extends RpgCommonWorldMaps {
    /**
     * Loads the content of a `.world` file from Tiled Map Editor into the map scene
     * 
     * > Note, that if the map already exists (i.e. you have already defined an RpgMap), the world will retrieve the already existing map. Otherwise it will create a new map
     * 
     * @title Load World
     * @method wold.load(world,sceneMap)
     * @param {object} world 
     * object is 
     * ```ts
     * {
     *  id?: string
     *  maps: {
     *      id?: string
     *      properties?: object
     *      fileName: string;
            height: number;
            width: number;
            x: number;
            y: number;
     *  }[],
        onlyShowAdjacentMaps: boolean, // only for Tiled Map Editor
        type: 'world' // only for Tiled Map Editor
     * }
     * ```
     * @param {RpgSceneMap} sceneMap
     * @since 3.0.0-beta.8
     * @memberof RpgWorldMaps
     */
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
                file: fileName
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