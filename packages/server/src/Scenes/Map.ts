
import { HookServer, RpgCommonMap, RpgPlugin, Utils } from '@rpgjs/common'
import { World } from 'simple-room'
import { isTiledFormat, TiledMap } from '@rpgjs/tiled'
import { MapOptions, MapData } from '../decorators/map'
import { RpgMap } from '../Game/Map'
import { RpgWorldMaps, WorldMap } from '../Game/WorldMaps'
import { RpgEvent, RpgPlayer } from '../Player/Player'
import { RpgServerEngine } from '../server'
import { inject } from '../inject'

export interface RpgClassMap<T> {
    id?: string
    file?: string
    new(server: any): T,
}

type SceneMapObject = {
    maps: any[],
    worldMaps: WorldMap[]
    events: RpgEvent[]
}

export class SceneMap {
    static readonly id: string = 'map'

    private maps: any[] = []
    private mapsById: {
        [mapId: string]: RpgClassMap<RpgMap>
    } = {}
    private worldMaps: Map<string, RpgWorldMaps> = new Map()
    private server: RpgServerEngine = inject(RpgServerEngine)

    constructor(sceneMapObject: SceneMapObject) {
        const { maps, worldMaps, events } = sceneMapObject
        this.maps = maps
        this.mapsById = {}
        RpgCommonMap.buffer.clear()
        if (this.maps) {
            for (let map of this.maps) {
                this.createDynamicMap(map)
            }
        }
        if (worldMaps) {
            for (let worldMap of worldMaps) {
                this.createDynamicWorldMaps(worldMap)
            }
        }
    }

    /**
     * Returns an array of RpgClassMap objects that represent maps with static properties.
     * 
     * @title Get maps
     * @method sceneMap.getMaps()
     * @returns {RpgClassMap<RpgMap>[]} Array of RpgClassMap objects.
     * @since 4.0.0
     * @example
     * ```typescript
     * const maps = scene.getMaps();
     * console.log(maps);
     * // Output: [
     * // { file: 'maps/level1.tmx', id: 'level1', type: 'map' },
     * // { file: 'maps/level2.tmx', id: 'level1', type: 'map' },
     * // { file: 'maps/level3.tmx', id: 'level1', type: 'map' }
     * // ]
     * ```
     * @memberof SceneMap
     */
    getMaps(): RpgClassMap<RpgMap>[] {
        return Object.values(this.mapsById)
    }

    getMapBydId(id: string): RpgClassMap<RpgMap> | null {
        let mapClass = this.mapsById[id]
        if (!mapClass) {
            return null
        }
        if (!Utils.isClass(mapClass)) mapClass = Utils.createConstructor<RpgClassMap<RpgMap>>(mapClass)
        return mapClass
    }

    async loadMap(id: string): Promise<RpgMap | undefined> {
        const mapClass = this.getMapBydId(id)

        if (!mapClass) {
            console.log(`Map ${id} not exists`)
            return
        }

        let mapInstance

        if (mapClass['buffer'].has(id)) {
            return mapClass['buffer'].get(id)
        }

        if (RpgCommonMap.buffer.has(id)) {
            mapInstance = RpgCommonMap.buffer.get(id)
        }
        else {
            const room = new mapClass(this.server)
            room.$schema.users = [
                {
                    ...RpgPlayer.schemas,
                    ...this.server['playerProps']
                }
            ]
            mapInstance = World.addRoom(id, room)
            await mapInstance.load()
        }

        return mapInstance
    }

    /**
    * Loads the content of a `.world` file from Tiled Map Editor into the map scene
    * 
    * > Note, that if the map already exists (i.e. you have already defined an RpgMap), the world will retrieve the already existing map. Otherwise it will create a new map
    * 
    * @title Create worlds dynamically
    * @method sceneMap.createDynamicWorldMaps(world)
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
    * 
    * @since 3.0.0-beta.8
    * @memberof SceneMap
    */
    createDynamicWorldMaps(world: WorldMap): RpgWorldMaps {
        world.id = world.id || Utils.generateUID()
        const worldMap = new RpgWorldMaps(world.id).load(world, this)
        this.worldMaps.set(world.id, worldMap)
        return worldMap
    }

    /**
     * Recover a world
     * 
     * @title Recover a world
     * @method sceneMap.getWorldMaps(id)
     * @param {string} id world id 
     * @return { RpgWorldMaps | undefined }
     * @since 3.0.0-beta.8
     * @memberof SceneMap
     */
    getWorldMaps(id: string): RpgWorldMaps | undefined {
        return this.worldMaps.get(id)
    }

    /**
    * Delete a world
    * 
    * @title Delete a world
    * @method sceneMap.deleteWorldMaps(id)
    * @param {string} id world id 
    * @since 3.0.0-beta.8
    * @memberof SceneMap
    */
    deleteWorldMaps(id: string): void {
        this.worldMaps.delete(id)
    }

    /**
     * Create a dynamic map
     * 
     * Since version 3.0.0-beta.8, you can just pass the path to the file. The identifier will then be the name of the file
     * 
     * @method sceneMap.createDynamicMap(mapData)
     * @title Create a dynamic map
     * @param {object | RpgMap | string} mapData The same property as [@MapData decorator](https://docs.rpgjs.dev/classes/map.html#mapdata-decorator)
     * @returns {RpgMap}
     * @since 3.0.0-beta.4
     * @memberof SceneMap
     * @example
     * ```ts
     * sceneMap.createDynamicMap({
     *      id: 'myid',
     *      file: require('./tmx/mymap.tmx')
     * })
     * ```
     * 
     * And later, on the player:
     * 
     * ```ts
     * player.changeMap('myid')
     * ```
     * 
     * --- 
     * 
     * since beta.8
     * 
     * ```ts
     * sceneMap.createDynamicMap(require('./tmx/mymap.tmx')) // id is "mymap"
     * ```
     */
    createDynamicMap(mapData: MapOptions | string | RpgClassMap<RpgMap> | TiledMap): RpgClassMap<RpgMap> | never {
        if (Utils.isString(mapData)) {
            const id = Utils.extractId(mapData as string)
            if (!id) {
                throw new Error('Unable to extract the file identifier. Check that the file has only the following characters: [a-zA-Z0-9-_$!]+')
            }
            mapData = {
                id: id[1],
                file: mapData
            } as MapOptions
        }
        if (isTiledFormat(mapData)) {
            const tiledData = (mapData as TiledMap)
            mapData = {
                file: { ...tiledData }
            } as MapOptions
        }
        if (!(mapData as MapOptions).id) (mapData as MapOptions).id = Utils.generateUID()
        if (!Utils.isClass(mapData)) {
            @MapData(mapData as MapOptions)
            class DynamicMap extends RpgMap { }
            mapData = DynamicMap
        }
        const map: RpgClassMap<RpgMap> = mapData as any
        this.mapsById[map.id as string] = map
        return map
    }

    async changeMap(
        mapId: string,
        player: RpgPlayer,
        positions?: { x: number, y: number, z?: number } | string
    ): Promise<RpgMap | null | boolean> {

        const boolArray: boolean[] = await RpgPlugin.emit(HookServer.PlayerCanChangeMap, [player, this.getMapBydId(mapId)], true)

        if (boolArray.some(el => el === false)) {
            return null
        }

        // if just teleport, not change map
        if (player.map === mapId) {
            await player.teleport(positions || 'start')
            return null
        }

        player.emit('preLoadScene', {
            id: mapId
        })

        player.prevMap = player.map

        if (player.prevMap) {
            await player.execMethod('onLeaveMap', <any>[player.getCurrentMap()])
            World.leaveRoom(player.prevMap, player.id)
        }

        player.map = mapId
        player.events = {}
        player.tmpPositions = positions as any

        const scalabilityArray: boolean[] = await RpgPlugin.emit(HookServer.ScalabilityChangeServer, player)

        if (scalabilityArray.some(el => el === true)) {
            return true
        }

        player.tmpPositions = null

        const mapInstance = await this.loadMap(mapId)

        if (!mapInstance) return null

        if (!player.height) player.height = mapInstance.tileHeight
        if (!player.width) player.width = mapInstance.tileWidth
        if (!player.hitbox.h) player.hitbox.h = mapInstance.tileHeight
        if (!player.hitbox.w) player.hitbox.w = mapInstance.tileWidth

        player.emitSceneMap()

        // if room is removed after load map (for unit tests)
        if (!World.getRoom(mapId)) {
            return null
        }

        player.teleport(positions || 'start')

        World.joinRoom(mapId, player.id)

        player = World.getUser(player.id) as RpgPlayer

        if (player) {
            mapInstance.loadCommonEvents(this.server.inputOptions.events, player)
            player.createDynamicEvent(<any>mapInstance._events, false)
            await player.execMethod('onJoinMap', <any>[mapInstance])
        }

        return mapInstance
    }
}