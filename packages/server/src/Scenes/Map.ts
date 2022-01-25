
import { RpgCommonMap, Utils } from '@rpgjs/common'
import { World } from '@rpgjs/sync-server'
import { MapOptions } from '../decorators/map'
import { RpgMap } from '../Game/Map'

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
     * @param {object | RpgMap} mapData The same property as [@MapData decorator](https://docs.rpgjs.dev/classes/map.html#mapdata-decorator)
     * @returns {void}
     * @since 3.beta-4
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

    async changeMap(mapId, player, positions?): Promise<RpgMap> {
        player.prevMap = player.map
        player.map = mapId
        player.events = []

        if (player.prevMap) {
            World.leaveRoom(player.prevMap, player.id)
            player.execMethod('onLeave', [player], player.mapInstance)
            player.execMethod('onLeaveMap', [player.mapInstance])
        }

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

        player = World.getUser(player.id)

        if (player) {
            player.execMethod('onEnter', [player, player.prevMap || null], mapInstance)
            player.execMethod('onJoinMap', [mapInstance])

            player.teleport(positions || 'start')
            player.createDynamicEvent(mapInstance._events, false)
        }
        
        return mapInstance
    }
}