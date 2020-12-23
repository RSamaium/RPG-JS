import { RpgCommonMap, RpgCommonPlayer, Utils }  from '@rpgjs/common'
import merge from 'lodash.merge'
import { ItemManager } from './ItemManager'
import { GoldManager } from './GoldManager'
import { World } from '@rpgjs/sync-server'
import { StateManager } from './StateManager';
import { SkillManager } from './SkillManager'
import { ParameterManager } from './ParameterManager';
import { EffectManager } from './EffectManager';
import { ClassManager } from './ClassManager';
import { ElementManager } from './ElementManager'
import { GuiManager } from './GuiManager'
import { VariableManager } from './VariableManager'
import { Frequency, MoveManager, Speed } from './MoveManager'
import { BattleManager } from './BattleManager';

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
import { RpgMap } from '../Game/Map'

const { 
    isPromise, 
    applyMixins,
    isString
} = Utils

const itemSchemas = { 
    name: String,
    description: String,
    price: Number,
    consumable: Boolean
}

const playerSchemas = {
    hp: Number,
    sp: Number,
    gold: Number,
    level: Number, 
    exp: Number, 
    name: String, 
    expForNextlevel: Number,
    items: [{ nb: Number, item: itemSchemas }],
    _class: { name: String, description: String },
    equipments: [itemSchemas],
    skills: [{ name: String, description: String, spCost: Number }],
    states: [{ name: String, description: String }],
    effects: [String],

    graphic: String,
    action: Number,
    map: String,

    speed: Number,
    canMove: Boolean,
    through: Boolean, 

    width: Number,
    height: Number,
    wHitbox: Number,
    hHitbox: Number
}

export class RpgPlayer extends RpgCommonPlayer {

    public readonly type: string = 'player'

    static schemas = {
       ...playerSchemas,
        events: [{
            position: { x: Number, y: Number, z: Number },
            direction: Number,
            ...playerSchemas
        }]
    }
    
    private _name
  
    public events: any[] = []
    public param: any 
    public _rooms = []

    constructor(gameEngine?, options?, props?) {
        super(gameEngine, options, props)
        this.initialize()
    }

    // initialize data

    initialize() {
        this.expCurve =  {
            basis: 30,
            extra: 20,
            accelerationA: 30,
            accelerationB: 30
        }

        this.param = new Proxy({}, {
            get: (obj, prop: string) => this.getParamValue(prop), 
            set: () => {
                console.log("You cannot change the value because the parameter is linked to the parameter's curve")
                return false
            }
        })

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
    
        this.initialLevel = 1
        this.finalLevel = 99
        this.level = this.initialLevel
        this._gui = {}

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
     * @title Change Map
     * @method player.changeMap(mapId,positions)
     * @param {string} mapId
     * @param { {x: number, y: number} } [positions]
     * @returns {Promise<RpgMap>}
     * @memberof Player
     */
    changeMap(mapId: string, positions?): Promise<RpgMap> {
        return this.server.getScene('map').changeMap(mapId, this, positions) 
    }

    startBattle(enemies: { enemy: any, level: number }[]) {
        return this.server.getScene('battle').create(this, enemies)
    }

    load(json: any) {
        if (isString(json)) json = JSON.parse(<string>json)
        json = json.items.map(it => ({ nb: it.nb, item: this.databaseById(it.id) }))
        merge(this, json)
        /*if (this.map) {
            this.changeMap(this.map, this.position)
        }*/
    }

    save() {
        return this.toJSON()
    }

    toJSON() {
        const obj = {}
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
            'effects',
            'graphic',
            'map',
            'speed',
            'canMove',
            'through',
            'width',
            'height',
            'wHitbox',
            'hHistbox',
            'direction',
            'initialLevel',
            'finalLevel'
        ]
        for (let prop of props) {
            obj[prop] = this[prop]
        }
        return obj
    }
    
    /**
     * Run the change detection cycle. Normally, as soon as a hook is called in a class, the cycle is started. But you can start it manually
     * The method calls the `onChanges` method on events and synchronizes all map data with the client.
     * 
     * ```ts
     * // restarts the change detection cycle every 3s
     * setInterval(() => {
     *      player.hp += 10
     *      player.syncChanges()
     * }, 3000)
     * ```
     * @title Run Sync Changes
     * @method player.syncChanges()
     * @returns {void}
     * @memberof Player
     */
    syncChanges() {
        this._eventChanges()
        // Trigger detect changes cycle in @rpgjs/sync-server package
        World.forEachUserRooms(''+this.playerId, (room: any) => {
            if (room) room.$detectChanges()
        })
    }

    databaseById(id: string) {
        return this.server.database[id]
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
        this.emit('player.loadScene', {
            name, 
            data
        })
    }

    private _getMap(id) {
        return RpgCommonMap.buffer.get(id)
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

    public execMethod(methodName: string, methodData = [], instance = this): void {
        if (!instance[methodName]) {
            return
        }
        const ret = instance[methodName](...methodData)
        const sync = () => this.syncChanges()
        if (isPromise(ret)) {
            ret.then(sync)
        }
        else {
            sync()
        }
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
        const arrayEvents = [...Object.values(this.events), ...Object.values(events)]
        for (let event of arrayEvents) {
            // TODO, sync client
            if (event.onChanges) event.onChanges(this)
        }
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
    BattleManager
{
    _socket: any 
    server: any
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
    BattleManager
])