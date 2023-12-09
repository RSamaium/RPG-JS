import { RpgCommonPlayer, Utils, RpgPlugin, RpgCommonGame, RpgCommonMap, Direction } from '@rpgjs/common'
import { Room, WorldClass } from 'simple-room'
import { RpgMap, EventPosOption } from '../Game/Map'
import { Query } from '../Query'
import merge from 'lodash.merge'
import { ItemManager } from './ItemManager'
import { GoldManager } from './GoldManager'
import { StateManager } from './StateManager';
import { SkillManager } from './SkillManager'
import { ParameterManager } from './ParameterManager';
import { EffectManager } from './EffectManager';
import { ClassManager } from './ClassManager';
import { ElementManager } from './ElementManager'
import { GuiManager } from './GuiManager'
import { VariableManager } from './VariableManager'
import { Frequency, MoveManager, Speed } from './MoveManager'
import { BattleManager } from './BattleManager'

import {
    MAXHP,
    MAXSP,
    STR,
    INT,
    DEX,
    AGI,
    MAXHP_CURVE,
    MAXSP_CURVE,
    STR_CURVE,
    INT_CURVE,
    DEX_CURVE,
    AGI_CURVE
} from '../presets'
import { RpgServerEngine } from '../server'
import { RpgClassMap } from '../Scenes/Map'
import { RpgTiledWorldMap } from '../Game/WorldMaps'
import { CameraOptions, PositionXY_OptionalZ, SocketEvents, SocketMethods, LayoutObject } from '@rpgjs/types'
import { ComponentManager } from './ComponentManager'
import { Subject } from 'rxjs'
import { EventManager, EventMode } from '../Game/EventManager'
import { inject } from '../inject'

const {
    isPromise,
    applyMixins,
    isString
} = Utils

export interface Position { x: number, y: number, z: number }

const commonSchemaFeature = {
    name: {
        $permanent: false
    },
    description: {
        $permanent: false
    },
    id: String
}

const itemSchemas = {
    price: {
        $permanent: false
    },
    consumable: {
        $permanent: false
    },
    ...commonSchemaFeature
}

export const componentSchema = { id: String, value: String }
export const layoutSchema = {
    width: Number,
    height: Number,
    marginBottom: Number,
    marginTop: Number,
    marginLeft: Number,
    marginRight: Number,
    lines: [{
        col: [componentSchema]
    }]
}

const playerSchemas = {
    position: {
        x: Number,
        y: Number,
        z: Number
    },
    direction: Number,

    teleported: {
        $permanent: false
    },

    deleted: {
        $permanent: false
    },

    moving: {
        $permanent: false
    },

    param: Object,
    hp: Number,
    sp: Number,
    gold: Number,
    level: {
        $effects: ['$this.expForNextlevel', '$this.param']
    },
    expForNextlevel: {
        $permanent: false
    },
    exp: Number,
    name: String,
    items: [{ nb: Number, item: itemSchemas }],
    _class: commonSchemaFeature,
    equipments: [itemSchemas],
    skills: [
        {
            spCost: {
                $permanent: false
            },
            ...commonSchemaFeature
        }
    ],
    states: [commonSchemaFeature],
    effects: [String],

    layout: {
        top: layoutSchema,
        bottom: layoutSchema,
        left: layoutSchema,
        right: layoutSchema,
        center: layoutSchema
    },

    action: Number,
    map: String,

    speed: Number,
    frequency: Number,
    canMove: Boolean,
    through: Boolean,
    throughOtherPlayer: Boolean,

    width: Number,
    height: Number,
    wHitbox: Number,
    hHitbox: Number,

    // only for server

    _statesEfficiency: [{
        rate: {
            $syncWithClient: false
        },
        state: {
            $syncWithClient: false
        }
    }],
    tmpPositions: {
        $syncWithClient: false
    },
    initialLevel: {
        $syncWithClient: false
    },
    finalLevel: {
        $syncWithClient: false
    },
}

const layoutObject = {
    lines: []
}

export class RpgPlayer extends RpgCommonPlayer {
    public readonly type: string = 'player'
    static schemas = {
        ...playerSchemas,
        events: [playerSchemas]
    }

    layout: LayoutObject<any> = {
        top: layoutObject,
        bottom: layoutObject,
        left: layoutObject,
        right: layoutObject,
        center: layoutObject
    }

    private _name
    public events: any = {}
    public param: any
    public _rooms = []
    public session: string | null = null
    public prevMap: string = ''

    /** 
    * ```ts
    * retreive the server instance
    * ``` 
    * @title Server Instance
    * @prop {RpgServerEngine} player.server
    * @deprecated Use `inject(RpgServerEngine)` instead. Will be removed in v5
    * @memberof Player
    * */
    public server: RpgServerEngine
    private touchSide: boolean = false

    /** @internal */
    public tmpPositions: Position | string | null = null
    public otherPossessedPlayer: RpgPlayer | RpgEvent | null = null
    public followingId: string | null = null

    // Indicates whether to load data with load(). In this case, hooks are not triggered.
    private _dataLoading: boolean = false

    _lastFramePositions: {
        frame: number
        position: Position
    } | undefined

    /**
     * @deprecated Use `inject(RpgCommonGame)` instead. Will be removed in v5
     */
    public gameEngine: RpgCommonGame = inject(RpgCommonGame)

    // redefine type (as RpgPlayer)
    get otherPlayersCollision(): RpgPlayer[] {
        return super.otherPlayersCollision as RpgPlayer[]
    }

    get world(): WorldClass | undefined {
        return this.server?.world
    }

    // As soon as a teleport has been made, the value is changed to force the client to change the positions on the map without making a move.
    teleported: number = 0

    // a flag that lets the client know if the event is suppressed. The client can, for example, end animations before completely deleting the object (client side).
    deleted: boolean = false

    constructor(public playerId: string) {
        super(inject(RpgCommonGame), playerId)
        this.initialize()
    }

    /** @internal */
    initialize() {
        this.server = inject(RpgServerEngine)
        this.expCurve = {
            basis: 30,
            extra: 20,
            accelerationA: 30,
            accelerationB: 30
        }
        this.parameters = new Map()
        this.variables = new Map()
        this.states = []
        this.equipments = []
        this._effects = []
        this.items = []
        this.skills = []
        this.gold = 0
        this.exp = 0
        this.speed = Speed.Normal
        this.frequency = Frequency.None
        this.canMove = true
        this.through = false
        this.throughOtherPlayer = true
        this.initialLevel = 1
        this.finalLevel = 99
        this.level = this.initialLevel
        this._gui = {}
        this._elementsEfficiency = []
        this._statesEfficiency = []
        this.moving = false

        this.addParameter(MAXHP, MAXHP_CURVE)
        this.addParameter(MAXSP, MAXSP_CURVE)
        this.addParameter(STR, STR_CURVE)
        this.addParameter(INT, INT_CURVE)
        this.addParameter(DEX, DEX_CURVE)
        this.addParameter(AGI, AGI_CURVE)
        this.allRecovery()
    }

    _init() {
        this._socket.on('gui.interaction', ({ guiId, name, data }) => {
            if (this._gui[guiId]) {
                this._gui[guiId].emit(name, data)
                this.syncChanges()
            }
        })
        this._socket.on('gui.exit', ({ guiId, data }) => {
            this.removeGui(guiId, data)
        })
    }

    private get schema() {
        return {
            ...RpgPlayer.schemas,
            ...this.server['playerProps']
        }
    }

    /** 
     * ```ts
     * player.name = 'Link'
     * ``` 
     * @title Read/Give a name
     * @prop {string} player.name
     * @memberof Player
     * */
    get name(): string {
        return this._name
    }

    set name(val: string) {
        this._name = val
    }

    /**
     * Change your map. Indicate the positions to put the player at a place on the map
     * 
     * > The map must be added to RpgServer beforehand. Guide: [Create Map](/guide/create-map.html)
     * 
     * You don't have to give positions but you can put a starting position in the TMX file. Guide: [Start Position](/guide/player-start.html)
     * 
     * @title Change Map
     * @method player.changeMap(mapId,positions)
     * @param {string} mapId
     * @param { {x: number, y: number, z?: number} | string } [positions]
     * @returns {Promise<RpgMap | null>} null if map not exists
     * @memberof Player
     */
    changeMap(mapId: string, positions?: { x: number, y: number, z?: number } | string): Promise<RpgMap | null | boolean> {
        return this.server.sceneMap.changeMap(mapId, this, positions)
    }

    async autoChangeMap(nextPosition: Position): Promise<boolean> {
        const map = this.getCurrentMap()
        const worldMaps = map?.getInWorldMaps()
        let ret: boolean = false
        if (worldMaps && map) {
            const direction = this.getDirection()
            const marginLeftRight = map.tileWidth / 2
            const marginTopDown = map.tileHeight / 2

            const changeMap = async (adjacent, to) => {
                if (this.touchSide) {
                    return false
                }
                this.touchSide = true
                const [nextMap] = worldMaps.getAdjacentMaps(map, adjacent) as RpgClassMap<RpgMap>[]
                if (!nextMap) return false
                const id = nextMap.id as string
                const nextMapInfo = worldMaps.getMapInfo(id) as RpgTiledWorldMap
                return !!(await this.changeMap(id, to(nextMapInfo)))
            }

            if (nextPosition.x < marginLeftRight && direction == Direction.Left) {
                ret = await changeMap({
                    x: map.worldX - 1,
                    y: this.worldPositionY + 1
                }, nextMapInfo => ({
                    x: (nextMapInfo.width) - this.wHitbox - marginLeftRight,
                    y: map.worldY - nextMapInfo.y + nextPosition.y
                }))
            }
            else if (nextPosition.x > map.widthPx - this.wHitbox - marginLeftRight && direction == Direction.Right) {
                ret = await changeMap({
                    x: map.worldX + map.widthPx + 1,
                    y: this.worldPositionY + 1
                }, nextMapInfo => ({
                    x: marginLeftRight,
                    y: map.worldY - nextMapInfo.y + nextPosition.y
                }))
            }
            else if (nextPosition.y < marginTopDown && direction == Direction.Up) {
                ret = await changeMap({
                    x: this.worldPositionX + 1,
                    y: map.worldY - 1
                }, nextMapInfo => ({
                    x: map.worldX - nextMapInfo.x + nextPosition.x,
                    y: (nextMapInfo.height) - this.hHitbox - marginTopDown,
                }))
            }
            else if (nextPosition.y > map.heightPx - this.hHitbox - marginTopDown && direction == Direction.Down) {
                ret = await changeMap({
                    x: this.worldPositionX + 1,
                    y: map.worldY + map.heightPx + 1
                }, nextMapInfo => ({
                    x: map.worldX - nextMapInfo.x + nextPosition.x,
                    y: marginTopDown,
                }))
            }
            else {
                this.touchSide = false
            }
        }
        return ret
    }

    /**
     * Dynamically create an event in Scenario mode on the current map
     * 
     * ```ts
     * @EventData({
     *  name: 'EV-1'
     * })
     * class MyEvent extends RpgEvent {
     *  onAction() {
     *      console.log('ok')
     *  }
     * } 
     *
     * player.createDynamicEvent({
     *      x: 100,
     *      y: 100,
     *      event: MyEvent
     * })
     * ```
     * 
     * You can also put an array of objects to create several events at once
     * 
     * @title Create Dynamic Event
     * @since 3.0.0-beta.4
     * @method player.createDynamicEvent(eventObj | eventObj[])
     * @param { { x: number, y: number, z?: number, event: eventClass } } [eventsList]
     * @returns { { [eventId: string]: RpgEvent } }
     * @memberof Player
     */
    createDynamicEvent(eventsList: EventPosOption | EventPosOption[], forceMode: boolean = true): {
        [eventId: string]: RpgEvent
    } {
        if (!eventsList) return {}
        const mapInstance = this.getCurrentMap<RpgMap>()
        if (!mapInstance) {
            throw 'The player is not assigned to any map'
        }
        if (!Utils.isArray(eventsList)) {
            eventsList = [eventsList as EventPosOption]
        }
        let eventsListMode = eventsList
        if (forceMode) {
            eventsListMode = (eventsList as EventPosOption[]).map(event => {
                event.event.mode = EventMode.Scenario
                return event
            })
        }
        const events = mapInstance.createEvents(eventsListMode as EventPosOption[], EventMode.Scenario)
        let ret = {}
        for (let key in events) {
            this.events[key] = events[key]
            this.events[key].playerRelated = this
            this.events[key].execMethod('onInit', [this])
            // force to get Proxy object to sync with client
            ret = { ...ret, [key]: this.events[key] }
        }
        return ret
    }

    /**
     * Allows to change the positions of the player on the current map. 
     * You can put the X and Y positions or the name of the created shape on Tiled Map Editor.
     * If you have several shapes with the same name, one position will be chosen randomly.
     * 
     * ```ts
     * player.teleport({ x: 100, y: 500 })
     * ```
     * 
     * or
     * 
     * ```ts
     * player.teleport('my-shape-name')
     * ```
     * 
     * If no parameter: 
     * 
     * ```ts
     * player.teleport() // { x: 0, y: 0, z: 0 }
     * ```
     * 
     * @title Teleport on the map
     * @method player.teleport(positions)
     * @param { {x: number, y: number, z?: number} | string } [positions]
     * @returns {Promise<{ {x: number, y: number, z: number} }>}
     * @memberof Player
     */
    async teleport(positions?: PositionXY_OptionalZ | string): Promise<Position> {
        if (isString(positions)) positions = <Position>this.getCurrentMap()?.getPositionByShape(shape => shape.name == positions || shape.getType() == positions)
        if (!positions) positions = { x: 0, y: 0, z: 0 }
        if (!(positions as Position).z) (positions as Position).z = 0
        this.teleported++
        this.position = positions as Position
        // delete last frame positions because when the character is teleported, no server reconciliation is needed on the client side
        this._lastFramePositions = undefined
        // force interaction with event or shape
        await this.isCollided(this.position)
        return (positions as Position)
    }

    /**
     * Load the saved data with the method save()
     * If the player was on a map, it repositions the player on the map. 
     * 
     * ```ts
     * const json = player.save()
     * player.load(json)
     * ```
     * 
     * @title Load progress
     * @method player.load(json)
     * @param {string} json The JSON sent by the method save()
     * @returns {Promise<boolean | RpgMap | null>}
     * @memberof Player
     */
    async load(json: any): Promise<boolean | RpgMap | null> {
        this._dataLoading = true

        if (isString(json)) json = JSON.parse(json)

        const getData = (id) => new (this.databaseById(id))()

        for (let key in json) {
            const val = json[key]
            if (Utils.isObject(val) && val.hasOwnProperty('0')) {
                json[key] = Object.values(val)
            }
        }

        const items = {}

        if (json.items) {
            for (let it of json.items) {
                items[it.item.id] = getData(it.item.id)
            }
            json.items = json.items.map(it => ({ nb: it.nb, item: items[it.item.id] }))
            if (Array.isArray(json.equipments)) {
                json.equipments = json.equipments.map(it => {
                    items[it.id].equipped = true
                    return items[it.id]
                })
            }
        }
        if (json.states) json.states = json.states.map(state => getData(state.id))
        if (json.skills) json.skills = json.skills.map(skill => getData(skill.id))
        if (json.variables) json.variables = new Map(json.variables)

        merge(this, json)

        this.position = json.position

        if (json.map) {
            this.map = ''
            const map = await this.changeMap(json.map, json.tmpPositions || json.position)
            this._dataLoading = false
            return map
        }

        this._dataLoading = false

        return null
    }

    /**
     * Returns a JSON with all the data to keep in memory. Then use the `load()` method to load the data
     * 
     * You can also use the JSON.stringify 
     * 
     * ```ts
     * const json = player.save() // or JSON.stringify(player)
     * player.load(json)
     * ```
     * 
     * @title Save progress
     * @method player.save()
     * @returns {string}
     * @memberof Player
     */
    save() {
        return JSON.stringify(this)
    }

    // TODO
    toObject() {
        return {
            direction: this.direction,
            id: this.id,
            canMove: this.canMove,
            position: {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            },
            hitbox: {
                width: this.wHitbox,
                height: this.hHitbox
            },
            map: this.map,
            pendingMove: this.pendingMove,
            speed: this.speed
        }
    }

    toJSON() {
        const { permanentObject } = Room.compileSchema(this.schema)
        const snapshot = Room.extractObjectOfRoom(this, permanentObject)
        snapshot.variables = [...this.variables]
        return snapshot
    }

    /**
     * Run the change detection cycle. Normally, as soon as a hook is called in a class, the cycle is started. But you can start it manually
     * The method calls the `onChanges` method on events and synchronizes all map data with the client.

     * @title Run Sync Changes
     * @method player.syncChanges()
     * @returns {void}
     * @memberof Player
     */
    syncChanges() {
        this._eventChanges()
    }

    databaseById(id: string) {
        const data = this.server.database[id]
        if (!data) throw new Error(`The ID=${id} data is not found in the database. Add the data in the property "database" of @RpgServer decorator.`)
        return data
    }

    /**
     * Retrieves data from the current map
     * 
     * returns null if the player is not assigned to a map
     * 
     * @title Get Current Map
     * @method player.getCurrentMap()
     * @returns {RpgMap | null}
     * @memberof Player
     */
    getCurrentMap<T extends RpgMap = RpgMap>(): T | null {
        return this._getMap(this.map)
    }

    loadScene(name: string, data: any): void {
        this.emit(SocketEvents.LoadScene, {
            name,
            data
        })
    }

    emitSceneMap() {
        const mapInstance = this.getCurrentMap<RpgMap>()
        if (!mapInstance) {
            throw '[Emit] The player is not assigned to any map'
        }
        let { data: serializeMap } = Object.assign({}, mapInstance) as any
        delete serializeMap.shapes
        delete serializeMap.events
        delete serializeMap._events

        for (let layer of serializeMap.layers) {
            delete layer.map
        }

        this.loadScene('map', {
            id: mapInstance.id,
            sounds: mapInstance.sounds,
            ...serializeMap
        })
    }

    gameReload() {
        this.emit(SocketEvents.GameReload)
    }

    changeServer(url: string, port: number) {
        this.emit(SocketEvents.ChangeServer, {
            url,
            port
        })
    }

    private _getMap(id) {
        return RpgCommonMap.buffer.get(id)
    }

    /**
     * Calls the showAnimation() method on the client side to display an animation on the player
     * You must remember to create the spritesheet beforehand
     * 
     * For this type of spritesheet:
     * 
     * ```ts
     * @Spritesheet({
     *  id: 'fire',
     *  image: require('')
     *  textures: {
     *      default: {
     *          animations: [
     *          
     *          ]
     *      }
     *   }
     * })
     * export class FireAnimation {}
     * ```
     * 
     * Here is the call of the method:
     * 
     * ```ts
     * player.showAnimation('fire', 'default')
     * ```
     * 
     * If you don't want to put an animation on top of the event but replace the event graphic with another one, set true as last parameter.
     * This is useful, if for example, you want to make an animated character (sword stroke when pressing a key)
     * When the animation is finished, the original graphic is displayed again
     * 
     * 
     * ```ts
     * player.showAnimation('sword_stroke', 'default', true)
     * ```
     * 
     * Since version 3.0.0-rc, you can define several graphic elements. This allows you to animate them all at once
     * 
     * ```ts
     * player.showAnimation(['body', 'sword_stroke'], 'default', true)
     * ```
     * 
     * ::: tip
     * For this to work, the animations must have been previously defined in `setGraphic`.
     * :::
     * 
     * @title Show Animation
     * @method player.showAnimation(graphic,animationName,replaceGraphic=false)
     * @param {string | string[]} graphic spritesheet identifier
     * @param {string} animationName Name of the animation in the spritesheet
     * @param {boolean} [replaceGraphic] Replace the event graphic with the animation. After the end of the animation, the original graphic is reapplied
     * @returns {void}
     * @memberof Player
     */
    showAnimation(graphic: string | string[], animationName: string, replaceGraphic: boolean = false) {
        this.emitToMap('callMethod', {
            name: SocketMethods.ShowAnimation,
            params: [graphic, animationName, replaceGraphic]
        })
    }

    /**
     * TODO:
     * 1. It is necessary, on the client side, to make the character move even if controlled by someone else (problem: same playerId so, one will not move because of the client side prediction. Solution: create a new Id ? like session Id ?
     * 2. You would need several sockets per character. If the character changes map or changes server, all players controlling the character must be able to see it
     * 3. If the player regains control, what happens, do we return to the previous map?
     * 4. If it's an event, you must be able to get the event by id in GameEngine
     */
    takePossessionOf(otherPlayer: RpgPlayer | RpgEvent) {
        this.otherPossessedPlayer = otherPlayer
        this._socket.emit('playerJoined', { playerId: otherPlayer.id, session: this.session })
        this.cameraFollow(otherPlayer)
    }

    /**
     * Sends the client which event or player the camera should follow. You can set options to perform a motion animation
     * 
     * @title Camera Follow
     * @method player.cameraFollow(otherPlayer,options)
     * @param {RpgPlayer | RpgEvent} otherPlayer
     * @param {options} options
     * @param {object | boolean} [options.smoothMove] - animate. Set a boolean to use default parameters
     * @param {number} [options.smoothMove.time=1000] - time to animate
     * @param {string} [options.smoothMove.ease=linear] - easing to use. Go to https://easings.net to get function name
     * @returns {void}
     * @since 3.1.0
     * @memberof Player
     */
    cameraFollow(otherPlayer: RpgPlayer | RpgEvent, options: CameraOptions = {}) {
        if (otherPlayer.id == this.id) {
            this.followingId = null
        }
        else {
            this.followingId = otherPlayer.id
        }
        this.emit(SocketEvents.CallMethod, {
            objectId: this.playerId,
            name: SocketMethods.CameraFollow,
            params: [otherPlayer.id, options]
        })
    }

    /**
     * Emit data to clients with socket
     * 
     * @title Emit to client
     * @method player.emit(key,value)
     * @param {string} key
     * @param {any} value
     * @returns {void}
     * @memberof Player
     */
    public emit(key: string, value?: any): void {
        if (this._socket) this._socket.emit(key, value)
    }


    /**
     * Listen to the data (socket) sent by the client
     * 
     * @title Listen to data from the client
     * @method player.on(key,cb)
     * @param {string} key
     * @param {function} cb
     * @returns {void}
     * @memberof Player
     */
    public on(key: string, cb: Function) {
        if (this._socket) this._socket.on(key, cb)
    }

    /**
     * Adds a one-time listener function for the event named eventName
     * 
     * @title Listen one-time to data from the client
     * @method player.once(key,cb)
     * @since 3.0.0-beta.5
     * @param {string} key
     * @param {function} cb
     * @returns {void}
     * @memberof Player
     */
    public once(key: string, cb: Function) {
        if (this._socket) this._socket.once(key, cb)
    }

    /**
     * Removes all listeners of the specified eventName.
     * 
     * @title Removes all listeners of the client
     * @method player.off(key)
     * @since 3.0.0-beta.5
     * @param {string} key
     * @returns {void}
     * @memberof Player
     */
    public off(key: string) {
        if (this._socket) this._socket.removeAllListeners(key)
    }

    disconnect() {
        if (this._socket) this._socket.disconnect()
    }

    emitToMap(key: string, value: any) {
        const map = this.getCurrentMap()
        if (map) {
            map.$setCurrentState(`users.${this.id}.${key}`, value)
        }
    }

    private execMethodSync<T>(methodName: string, methodData = [], target?: any): T {
        let ret
        if (target && target[methodName]) {
            ret = target[methodName](...methodData)
        }
        return ret
    }

    async execMethod(methodName: string, methodData = [], target?: any) {
        const ignoreIfDataLoading = ['onLevelUp', 'onDead']
        if (ignoreIfDataLoading.includes(methodName) && this._dataLoading) {
            return
        }
        let ret
        if (target && target[methodName]) {
            ret = target[methodName](...methodData)
            if (isPromise(ret)) await ret
        }
        else {
            ret = await RpgPlugin.emit(`Server.${methodName}`, [this, ...methodData], true)
        }
        this.syncChanges()
        return ret
    }

    _triggerHook(name, val?) {
        if (this[name]) this[name](val)
        this.emit('Player.' + name, val)
    }

    // @internal
    /**
     * Allows you to manually update a status in the rooms that will then be sent to the customer.
     * @param path 
     * @example
     * ```ts
     * player.changeRoomState('hp')
     * ```
     */
    changeRoomState(path: string) {
        this.world?.forEachUserRooms(this.id, (room) => {
            (room as any).$setCurrentState(`users.${this.id}.${path}`)
        })
    }

    private _eventChanges() {
        if (!this._getMap(this.map)) return
        const {
            events
        } = this._getMap(this.map)
        const arrayEvents: any[] = [...Object.values(this.events), ...Object.values(events)]
        for (let event of arrayEvents) {
            if (event.onChanges) event.onChanges(this)
        }
    }

    /**
     * Allows to play a sound, heard only by the player or by the players of the map
     * 
     * Here is a sound, client side:
     * 
     * ```ts
     * import { Sound } from '@rpgjs/client'
     * @Sound({
     *      id: 'town-music',
     *      sound: require('./sound/town.ogg')
     * })
     * export class TownMusic {}
     * ```
     * 
     * Here is the call of the method, server side:
     * 
     * ```ts
     * player.playSound('town-music')
     * ```
     * 
     * If you want everyone to listen to the sound on the map:
     * 
     * ```ts
     * player.playSound('town-music', true)
     * ```
     * 
     * @title Play Sound
     * @method player.playSound(soundId,allMap=false)
     * @param {string} soundId Sound identifier, defined on the client side
     * @param {boolean} [forEveryone=false] Indicate if the sound is heard by the players on the map
     * @since 3.0.0-alpha.9
     * @returns {void}
     * @memberof Player
     */
    playSound(soundId: string, forEveryone: boolean = false) {
        const obj = {
            objectId: this.playerId,
            name: SocketMethods.PlaySound,
            params: [soundId]
        }
        if (!forEveryone) {
            this.emit(SocketEvents.CallMethod, obj)
            return
        }
        this.emitToMap(SocketEvents.CallMethod, obj)
    }

}

export interface RpgPlayer extends
    EventManager,
    ItemManager,
    GoldManager,
    StateManager,
    SkillManager,
    ParameterManager,
    EffectManager,
    ClassManager,
    ElementManager,
    GuiManager,
    VariableManager,
    MoveManager,
    BattleManager,
    ComponentManager {
    _socket: any
    vision,
    attachShape: any
}

applyMixins(RpgPlayer, [
    EventManager,
    ItemManager,
    GoldManager,
    StateManager,
    SkillManager,
    ParameterManager,
    EffectManager,
    ClassManager,
    ElementManager,
    GuiManager,
    VariableManager,
    MoveManager,
    BattleManager,
    ComponentManager
])

export interface RpgClassEvent<T> {
    _name: string
    new(): T,
}

export class RpgEvent extends RpgPlayer {

    public readonly type: string = 'event'
    properties: any = {}
    mode: EventMode
    playerRelated: RpgPlayer | null = null

    constructor(playerId: string) {
        super(playerId)
    }

    async execMethod(methodName: string, methodData = []) {
        if (!this[methodName]) {
            return
        }
        const ret = this[methodName](...methodData)
        return ret
    }

    changeRoomState(path: string) {
        const room = this.getCurrentMap()
        if (room) {
            (room as any).$setCurrentState(`events.${this.id}.${path}`)
        }
    }

    /**
    * Deletes the event from the map (in shared or scenario mode)
    * 
    * @title Remove
    * @since 4.0.0
    * @method event.remove()
    * @returns {boolean} true if the event has been removed. If false, the event is not on the map
    * @memberof RpgEvent
    */
    remove(): boolean {
        let bool = false
        if (this.playerRelated) bool = this.playerRelated.removeEvent(this.id)
        const map = this.getCurrentMap()
        if (map) {
            bool = map.removeEvent(this.id)
        }
        return bool
    }

    override emitToMap(key: string, value: any) {
        const map = this.getCurrentMap()
        if (map) {
            const eventPath = `events.${this.id}.${key}`
            if (this.playerRelated) {
                map.$setCurrentState(`users.${this.playerRelated.id}.${eventPath}`, value)
            }
            else {
                map.$setCurrentState(eventPath, value)
            }
        }
    }
}
