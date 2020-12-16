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

export class RpgPlayer extends RpgCommonPlayer {

    public readonly type: string = 'player'

    static schemas = {
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

    get name() {
        return this._name
    }

    set name(val: string) {
        this._name = val
    }

    setGraphic(graphic: string) {
        this.graphic = graphic
    }

    changeMap(mapId, positions?) {
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
    

  /*  applyDamage(otherPlayer: RpgPlayer, skill: any): { 
        damage: number, 
        critical: boolean, 
        elementVulnerable: boolean,
        guard: boolean,
        superGuard: boolean
    } {
        const getParam = (player) => {
            const params = {}
            this.parameters.forEach((val, key) => {
                params[key] = player.param[key]
            })
            return {
                [ATK]: player.atk,
                [PDEF]: player.pdef,
                [SDEF]: player.sdef,
                ...params
            }
        }
        let damage = 0, fn
        let critical = false
        let guard = false
        let superGuard = false
        let elementVulnerable = false
        const paramA = getParam(otherPlayer)
        const paramB = getParam(this)
        if (skill) {
            fn = this.getFormulas('damageSkill')
            if (!fn) {
                throw new Error('Skill Formulas not exists')
            }
            damage = fn(paramA, paramB, skill)
        }
        else {
            fn = this.getFormulas('damagePhysic')
            if (!fn) {
                throw new Error('Physic Formulas not exists')
            }
            damage = fn(paramA, paramB)
            const coef = this.coefficientElements(otherPlayer)
            if (coef >= 2) {
                elementVulnerable = true
            }
            damage *= coef
            fn = this.getFormulas('damageCritical')
            if (fn) {
                let newDamage = fn(damage, paramA, paramB)
                if (damage != newDamage) {
                    critical = true
                }
                damage = newDamage
            }
        }
        if (this.hasEffect(Effect.GUARD)) {
            fn = this.getFormulas('damageGuard')
            if (fn) {
                let newDamage = fn(damage, paramA, paramB)
                if (damage != newDamage) {
                    guard = true
                }
                damage = newDamage
            }
        }
        if (this.hasEffect(Effect.SUPER_GUARD)) {
            damage /= 4
        }
        this.hp -= damage
        return {
            damage,
            critical,
            elementVulnerable,
            guard,
            superGuard
        }
    }*/
    
    getFormulas(name) {
        return this.server.damageFormulas[name]
    }

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

    getCurrentMap() {
        return this._getMap(this.map)
    }

    private _getMap(id) {
        return RpgCommonMap.buffer.get(id)
    }

    public emit(key, value): void {
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
            _events
        } = this._getMap(this.map)
        const arrayEvents = [...this.events, ..._events]
        for (let event of arrayEvents) {
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
    MoveManager
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
    MoveManager
])