
import { RpgCommonMap, Utils } from '@rpgjs/common'
import { World } from '@rpgjs/sync-server'
import { MapOptions } from '../decorators/map'
import { RpgMap } from '../Game/Map'
import { RpgPlayer } from '../Player/Player'

export class SceneMap {

    static readonly id: string = 'map'

    private mapsById: object = {}
    
    constructor(private maps: any[], private server: any) {
        this.mapsById = {}
        if (this.maps) {
            for (let map of this.maps) {
                this.createDynamicMap(map)
            }
        }
    }

    getMapBydId(id) {
        let mapClass = this.mapsById[id]
        if (!mapClass) {
            console.log(`Map ${id} not exists`)
            return false
        }
        if (!Utils.isClass(mapClass)) mapClass = Utils.createConstructor(mapClass)
        return mapClass
    }

    async loadMap(id: string): Promise<RpgMap> {
        const mapClass = this.getMapBydId(id)
        let mapInstance
        
        if (mapClass.buffer.has(id)) {
            return mapClass.buffer.get(id)
        }

        if (RpgCommonMap.buffer.has(id)) {
            mapInstance =  RpgCommonMap.buffer.get(id)
        }
        else {
            mapInstance = World.addRoom(id, new mapClass(this.server))
            await mapInstance.load()
        }
       
        return mapInstance
    }

    /**
     * Create a dynamic map
     * 
     * @method sceneMap.createDynamicMap(mapData)
     * @title Create a dynamic map
     * @param {object | RpgMap} mapData The same property as [@MapData decorator](https://docs.rpgjs.dev/classes/map.html#mapdata-decorator)
     * @returns {void}
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
     */
    createDynamicMap(mapData: MapOptions) {
        mapData.id = mapData.id || Utils.generateUID()
        this.mapsById[mapData.id] = mapData
    }

    async changeMap(
        mapId: string, 
        player: RpgPlayer, 
        positions?: { x: number, y: number, z: number } | string
    ): Promise<RpgMap> {
        player.prevMap = player.map
        
        if (player.prevMap) {
            player.execMethod('onLeaveMap', <any>[player.getCurrentMap()])
            World.leaveRoom(player.prevMap, player.id)    
        }

        player.map = mapId
        player.events = []

        const mapInstance = await this.loadMap(mapId)

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

        World.joinRoom(mapId, player.id)

        player = World.getUser(player.id) as RpgPlayer

        if (player) {
            player.execMethod('onJoinMap', <any>[mapInstance])
            player.teleport(positions || 'start')
            player.createDynamicEvent(<any>mapInstance._events, false)
        }
        
        return mapInstance
    }
}