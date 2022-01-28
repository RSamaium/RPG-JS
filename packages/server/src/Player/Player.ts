import { RpgCommonPlayer, Utils, RpgPlugin, RpgCommonMap as RpgMap }  from '@rpgjs/common'
import { RpgMap as GameMap } from '../Game/Map'
import * as Kompute from 'kompute/build/Kompute'
import * as YUKA from 'yuka'
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
import { BehaviorManager } from './BehaviorManager'
import { EventOption, EventPosOption } from '../Game/Map'
import { EventMode, RpgEvent } from '..'

const { 
    isPromise, 
    applyMixins,
    isString
} = Utils

export interface Position { x: number, y: number, z: number }

const itemSchemas = { 
    name: String,
    description: String,
    price: Number,
    consumable: Boolean,
    id: String
}

const playerSchemas = {
    position: {
        x: Number, 
        y: Number,
        z: Number
    },
    direction: Number,
    teleported: Number,

    vision: {
        ellipse: Boolean,
        height: Number,
        width: Number,
        type: String
    },

    param: Object,
    hp: Number,
    sp: Number,
    gold: Number,
    level: Number, 
    exp: Number, 
    name: String, 
    expForNextlevel: Number,
    items: [{ nb: Number, item: itemSchemas }],
    _class: { name: String, description: String, id: String },
    equipments: [itemSchemas],
    skills: [{ name: String, description: String, spCost: Number, id: String }],
    states: [{ name: String, description: String, id: String }],
    effects: [String],

    graphic: String,
    action: Number,
    map: String,

    speed: Number,
    canMove: Boolean,
    through: Boolean, 
    throughOtherPlayer: Boolean,

    width: Number,
    height: Number,
    wHitbox: Number,
    hHitbox: Number
}

export class RpgPlayer extends RpgCommonPlayer {

    public readonly type: string = 'player'

    static schemas = {
       ...playerSchemas,
        events: [playerSchemas]
    }

    private _name
    public events: any = {}
    public param: any 
    public _rooms = []
    public prevMap: string = ''

    constructor(gameEngine?, playerId?) {
        super(gameEngine, playerId)
        this.initialize()
    }

    // As soon as a teleport has been made, the value is changed to force the client to change the positions on the map without making a move.
    teleported: number = 0

    initialize() {
        this.expCurve =  {
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

       // this.steerable = new Kompute.Steerable(this.playerId, new Kompute.Vector3D(), new Kompute.Vector3D(10, 10, 0))

        this.steerable = new YUKA.Vehicle()
    
        this.initialLevel = 1
        this.finalLevel = 99
        this.level = this.initialLevel
        this._gui = {}
        this._elementsEfficiency = []
        this._statesEfficiency = []

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
     * Give the spritesheet identifier
     * 
     * > You must, on the client side, create the spritesheet in question. Guide: [Create Sprite](/guide/create-sprite.html)
     * 
     * @title Set Graphic
     * @method player.setGraphic(graphic)
     * @param {string} graphic
     * @returns {void}
     * @memberof Player
     */
    setGraphic(graphic: string) {
        this.graphic = graphic
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
     * @returns {Promise<RpgMap>}
     * @memberof Player
     */
    changeMap(mapId: string, positions?): Promise<RpgMap> {
        return this.server.getScene('map').changeMap(mapId, this, positions) 
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
        if (!eventsList) return  {}
        const mapInstance: GameMap = this.getCurrentMap() as GameMap
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
        for (let key in events) {
            this.events[key] = events[key]
            this.events[key].execMethod('onInit', [this])
        }
        return events
    }

    /**
     * Removes an event from the map (Scenario Mode). Returns false if the event is not found
     * @title Remove Event
     * @since 3.0.0-beta.4
     * @method player.removeEvent(eventId)
     * @param {string} eventId Event Name
     * @returns {boolean}
     * @memberof Player
     */
    removeEvent(eventId: string): boolean {
        if (!this.events[eventId]) return false
        delete this.events[eventId]
        return true
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
     * @returns { {x: number, y: number, z: number} }
     * @memberof Player
     */
    teleport(positions?: {x: number, y: number, z?: number} | string): Position {
        if (isString(positions)) positions = <Position>this.getCurrentMap().getPositionByShape(shape => shape.name == positions || shape.type == positions)
        if (!positions) positions = { x: 0, y: 0, z: 0 }
        if (!(positions as Position).z) (positions as Position).z = 0
        this.teleported++
        this.position = positions as Position
        // force interaction with event or shape
        this.isCollided(this.position)
        return (positions as Position)
    }

    startBattle(enemies: { enemy: any, level: number }[]) {
        return this.server.getScene('battle').create(this, enemies)
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
     * @returns {string}
     * @memberof Player
     */
    load(json: any) {
        if (isString(json)) json = JSON.parse(json)

        const getData = (id) => new (this.databaseById(id))() 

        const items = {}
        for (let it of json.items) {
            items[it.item] = getData(it.item)
        }
        json.items = json.items.map(it => ({ nb: it.nb, item: items[it.item] }))
        json.equipments = json.equipments.map(it => {
            items[it].equipped = true
            return items[it]
        })
        json.states = json.states.map(id => getData(id))
        json.skills = json.skills.map(id => getData(id))
        json.variables = new Map(json.variables)
        merge(this, json)
        this.position = json.position
        if (json.map) {
            this.map = ''
            this.changeMap(json.map, json.position)
        }
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

    toJSON() {
        const obj: any = {}
        const props = [
            'hp', 
            'sp',
            'gold', 
            'level', 
            'exp', 
            'name', 
            'position', 
            'items', 
            '_class', 
            'equipments', 
            'skills',
            'states',
            '_statesEfficiency',
            'effects',
            'graphic',
            'map',
            'speed',
            'canMove',
            'through',
            'width',
            'height',
            'wHitbox',
            'hHitbox',
            'direction',
            'initialLevel',
            'finalLevel'
        ]
        for (let prop of props) {
            obj[prop] = this[prop]
        }
        obj.variables = [...this.variables]
        return obj
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
     * @title Get Current Map
     * @method player.getCurrentMap()
     * @returns {RpgMap}
     * @memberof Player
     */
    getCurrentMap(): RpgMap {
        return this._getMap(this.map)
    }

    loadScene(name: string, data: any): void {
        this.emit('loadScene', {
            name, 
            data
        }) 
    }

    private _getMap(id) {
        return RpgMap.buffer.get(id)
    }

    // TODO
    showEffect() {
        this.emit('callMethod', { 
            objectId: this.playerId,
            name: 'addEffect',
            params: []
        })
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
     * ```ts
     * player.showAnimation('sword_stroke', 'default', true)
     * ```
     * 
     * @title Show Animation
     * @method player.showAnimation(graphic,animationName,replaceGraphic=false)
     * @param {string} graphic spritesheet identifier
     * @param {string} animationName Name of the animation in the spritesheet
     * @param {boolean} [replaceGraphic] Replace the event graphic with the animation. After the end of the animation, the original graphic is reapplied
     * @returns {void}
     * @memberof Player
     */
    showAnimation(graphic: string, animationName: string, replaceGraphic: boolean = false) {
        this.emitToMap('callMethod', { 
            objectId: this.playerId,
            name: 'showAnimation',
            params: [graphic, animationName, replaceGraphic]
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
    public emit(key: string, value: any): void {
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

    emitToMap(key: string, value: any) {
        Query.getPlayersOfMap(this.map).forEach(player => player.emit(key, value))
    }

    async execMethod(methodName: string, methodData = []) {
        const ret = await RpgPlugin.emit(`Server.${methodName}`, [this, ...methodData], true)
        this.syncChanges()
        return ret
    }

    _triggerHook(name, val?) {
        if (this[name]) this[name](val)
        this.emit('Player.' + name, val)
    }

    private _eventChanges() {
        if (!this._getMap(this.map)) return
        const {
            events
        } = this._getMap(this.map)
        const arrayEvents: any[] = [...Object.values(this.events), ...Object.values(events)]
        for (let event of arrayEvents) {
            // TODO, sync client
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
     * @param {boolean} [allMap] Indicate if the sound is heard by the players on the card
     * @since 3.0.0-alpha.9
     * @stability 1
     * @returns {void}
     * @memberof Player
     */
    playSound(soundId: string, allMap: boolean = false) {
        const obj = { 
            objectId: this.playerId,
            name: 'playSound',
            params: [soundId]
        }
        if (!allMap) {
            this.emit('callMethod', obj)
            return
        }
        this.emitToMap('callMethod', obj)
    }
}

export interface RpgPlayer extends 
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
    BehaviorManager
{
    _socket: any 
    server: any,
    vision,
    steerable: Kompute,
    attachShape: any
}

applyMixins(RpgPlayer, [
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
    BehaviorManager
])