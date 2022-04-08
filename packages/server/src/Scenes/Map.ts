
import { RpgCommonMap, Utils } from '@rpgjs/common'
import { World } from '@rpgjs/sync-server'
import { TiledWorld } from '@rpgjs/tiled'
import { MapOptions, MapData } from '../decorators/map'
import { RpgMap } from '../Game/Map'
import { RpgWorldMaps, WorldMap } from '../Game/WorldMaps'
import { RpgPlayer } from '../Player/Player'
import { RpgServerEngine } from '../server'

export interface RpgClassMap<T> {
    id?: string
    new (server: any): T,
}

export class SceneMap {

    static readonly id: string = 'map'

    private mapsById: {
        [mapId: string]: RpgClassMap<RpgMap>
    } = {}
    private worldMaps: Map<string, RpgWorldMaps> = new Map()
    
    constructor(private maps: any[], worldMaps: WorldMap[], private server: RpgServerEngine) {
        this.mapsById = {}
        RpgCommonMap.buffer.clear()
        if (this.maps) {
            for (let map of this.maps) {
                this.createDynamicMap(map)
            }
        }
        if (this.worldMaps) {
            for (let worldMap of worldMaps) {
                this.createDynamicWorldMaps(worldMap)
            }
        }
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
            mapInstance = World.addRoom(id, new mapClass(this.server))
            await mapInstance.load()
        }
       
        return mapInstance
    }

    createDynamicWorldMaps(world: WorldMap): RpgWorldMaps {
        world.id = world.id || Utils.generateUID()
        const worldMap = new RpgWorldMaps(world.id).load(world, this)
        this.worldMaps.set(world.id, worldMap)
        return worldMap
    }

    getWorldMaps(id: string): RpgWorldMaps | undefined {
        return this.worldMaps.get(id)
    }

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
    createDynamicMap(mapData: MapOptions | string | RpgClassMap<RpgMap>, worldMap?: RpgWorldMaps): RpgClassMap<RpgMap> | never {
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
        if (!(mapData as MapOptions).id) (mapData as MapOptions).id = Utils.generateUID()   
        if (!Utils.isClass(mapData)) {
            @MapData(mapData as MapOptions)
            class DynamicMap extends RpgMap {}
            mapData = DynamicMap
        }
        const map: RpgClassMap<RpgMap> = mapData as any
        if (worldMap) {
            map.prototype.worldMapParent = worldMap
        }
        this.mapsById[map.id as string] = map
        return map
    }

    async changeMap(
        mapId: string, 
        player: RpgPlayer, 
        positions?: { x: number, y: number, z?: number } | string
    ): Promise<RpgMap | null> {
        player.prevMap = player.map
        
        if (player.prevMap) {
            player.execMethod('onLeaveMap', <any>[player.getCurrentMap()])
            World.leaveRoom(player.prevMap, player.id)    
        }

        player.map = mapId
        player.events = {}

        const mapInstance = await this.loadMap(mapId)

        if (!mapInstance) return null

        if (!player.height) player.height = mapInstance.tileHeight
        if (!player.width) player.width = mapInstance.tileWidth
        if (!player.hitbox.h) player.hitbox.h = mapInstance.tileHeight
        if (!player.hitbox.w) player.hitbox.w = mapInstance.tileWidth

        let { data: serializeMap } = Object.assign({}, RpgCommonMap.buffer.get(mapId))
        delete serializeMap.shapes 
        delete serializeMap.events
        delete serializeMap._events

        for (let layer of serializeMap.layers) {
            delete layer.map
        }

        player.loadScene('map', {
            id: mapId,
            sounds: mapInstance.sounds,
            ...serializeMap
        })

        player.teleport(positions || 'start')
  
        World.joinRoom(mapId, player.id)

        player = World.getUser(player.id) as RpgPlayer

        if (player) {
            player.createDynamicEvent(<any>mapInstance._events, false)
            player.execMethod('onJoinMap', <any>[mapInstance])
        }

        return mapInstance
    }
}