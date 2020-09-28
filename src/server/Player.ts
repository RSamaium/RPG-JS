import { random } from '../common/Utils'
import RpgCommonMap  from '../common/Map'
import CommonPlayer from '../common/Player'
import { Gui, DialogGui } from './Gui'
import { isPromise } from '../common/Utils'
import { 
    MAXHP, 
    MAXSP,
    MAXHP_CURVE, 
    MAXSP_CURVE 
} from '../../preset'

export default class Player extends CommonPlayer {

    public readonly type: string = 'player'

    private _gold = 0
    private _hp = 0
    private _sp = 0
    private name = ''
    private skills: any[] = []
    private items: any[] = []
    private states: any[] = []
    private equipments: any[] = []
    private _exp: number = 0
    private _level: number = 0
    private initialLevel:number = 1
    private finalLevel:number = 99
    private expCurve: { 
        basis: number,
        extra: number,
        accelerationA: number
        accelerationB: number
    } = {
        basis: 30,
        extra: 20,
        accelerationA: 30,
        accelerationB: 30
    }
    private _class: any
    private variables: Map<string, any> = new Map()
    private _parameters: Map<string, {
        start: number,
        end: number,
        extraValue: number
    }> = new Map()

    protected paramsChanged: Set<string> = new Set()
    private _gui: { [id: string]: Gui } = {}
    public socket: any
    public server: any
    public map: string = ''
    public events: any[] = []
    public param: any 

    constructor(gamePlayer, options, props) {
        super(gamePlayer, options, props)
        this._gold = 0
        this._level = this.initialLevel
        this.param = new Proxy({}, {
            get: (obj, prop: string) => this.getParamValue(prop), 
            set: () => {
                console.log("You cannot change the value because the parameter is linked to the parameter's curve")
                return false
            }
        })
        this.addParameter(MAXHP, MAXHP_CURVE)
        this.addParameter(MAXSP, MAXSP_CURVE)
        this.allRecovery()
    }

    _init() {
        this.socket.on('gui.interaction', ({ guiId, name, data }) => {
            if (this._gui[guiId]) {
                this._gui[guiId].emit(name, data)
            }
        })
        this.socket.on('gui.exit', ({ guiId, data }) => {
            this.removeGui(guiId, data)
        })
    }

    set gold(val) {
        if (val < 0) {
            val = 0
        }
        this._gold = val
    }

    get gold() {
        return this._gold
    }

    set hp(val) {
        if (val > this.param[MAXHP]) {
            val = this.param[MAXHP]
        }
        else if (val <= 0) { 
            this._triggerHook('onDead')
            val = 0
        }
        this.paramsChanged.add('hp')
        this._hp = val
    }

    get hp() {
        return this._hp
    }

    set sp(val) {
        if (val > this.param[MAXSP]) {
            val = this.param[MAXSP]
        }
        this._sp = val
    }

    get sp() {
        return this._sp
    }

    set exp(val) {
        this._exp = val
        const lastLevel = this.level
        while (this.expForNextlevel < this._exp) {
            this.level += 1
        }
        //const hasNewLevel = player.level - lastLevel
    }

    get exp() {
        return this._exp
    }

    set level(val) {
        const lastLevel = this._level
        if (this.finalLevel && this._level > this.finalLevel) {
            val = this.finalLevel
        }
        if (this._class) {
            for (let i = this._level ; i <= val; i++) {
                for (let skill of this._class.skillsToLearn) {
                    if (skill.level == i) {
                        this.learnSkill(skill.skill)
                    }
                }
            }
        }
        const hasNewLevel = val - lastLevel
        if (hasNewLevel > 0) this._triggerHook('onLevelUp', hasNewLevel)
        this._level = val
    }

    get level() {
        return this._level
    }

    get expForNextlevel() {
        return this._expForLevel(this.level + 1)
    }

    addParameter(name: string, { start, end }: { start: number, end: number }) {
        this._parameters.set(name, {
            start,
            end,
            extraValue: 0
        })
    }

    private getParam(name: string) {
        const features = this._parameters.get(name)
        if (!features) {
            throw `Parameter ${name} not exists. Please use addParameter() before`
        }
        return features
    }

    getParamValue(name) {
        const features = this.getParam(name)
        let curveVal = Math.floor((features.end - features.start) * ((this.level-1) / (this.finalLevel - this.initialLevel))) + features.start
        curveVal += features.extraValue
        return curveVal
    }

    setParamExtraValue(name, val) {
        const param = this.getParam(name)
        param.extraValue = val
    }

    setGraphic(graphic) {
        this.graphic = graphic
    }

    changeMap(mapId, positions) {
        return this.server.getScene('map').changeMap(mapId, this, positions)
    }

    startBattle() {
        return this.server.getScene('battle').create(this)
    }

    setClass(_class) {
        this._class = new _class()
    }

    getItem(itemClass) {
        const index = this._getItemIndex(itemClass)
        return this.items[index]
    }

    _getItemIndex(itemClass) {
        return this.items.findIndex(it => it.item instanceof itemClass)
    }

    addItem(itemClass, nb = 1) {
        const itemIndex = this._getItemIndex(itemClass)
        if (itemIndex != -1) {
            this.items[itemIndex].nb += nb
        }
        else {
            const instance = new itemClass()
            this.items.push({
                item: instance,
                nb
            })
        }
    }

    removeItem(itemClass, nb = 1) {
        const itemIndex = this._getItemIndex(itemClass)
        if (itemIndex == -1) {
            return false
        }
        const currentNb = this.items[itemIndex].nb
        if (currentNb - nb <= 0) {
            this.items.splice(itemIndex, 1)
        }
        else {
            this.items[itemIndex].nb -= nb
        }
    }

    buyItem(itemClass, nb = 1) {
        if (!itemClass.price) {
            return {
                msg: `Define a price > 0 to buy ${itemClass.name}`,
                id: 'NOT_PRICE'
            }
        }
        const totalPrice = nb * itemClass.price
        if (this.gold < totalPrice) {
            return {
                msg: `not enough gold to buy ${nb} ${itemClass.name}`,
                id: 'NOT_ENOUGH_GOLD'
            }
        }
        this.gold -= totalPrice
        this.addItem(itemClass, nb)
    }

    sellItem(itemClass, nbToSell = 1) {
        const inventory = this.getItem(itemClass)
        if (!inventory) {
            return {
                msg: `The item ${itemClass.name} is not in inventory`,
                id: 'ITEM_NOT_INVENTORY'
            }
        }
        const { item, nb } = inventory
        if (nb - nbToSell < 0) {
            return {
                msg: `Too many items to sell: ${nbToSell} ${itemClass.name}, only ${nb} in inventory`,
                id: 'TOO_MANY_ITEM_TO_SELL'
            }
        }
        this.gold += (itemClass.price / 2) * nbToSell
        this.removeItem(itemClass, nbToSell)
    }

    useItem(itemClass) {
        const inventory = this.getItem(itemClass)
        if (!inventory) {
            return {
                msg: `The item ${itemClass.name} is not in inventory`,
                id: 'ITEM_NOT_INVENTORY'
            }
        }
        const { item } = inventory
        if (!item.consumable) {
            return {
                msg: 'You can not use.',
                id: 'NOT_USE_ITEM'
            }
        }
        const hitRate = item.hitRate || 100
        const rand = random(0, 100)
        if (rand > hitRate) {
            this.removeItem(itemClass)
            return {
                msg: 'Failed to use the item',
                id: 'USE_CHANCE_ITEM_FAILED'
            }
        }
        if (item.hpValue) {
            this.hp += item.hpValue
        }
        if (item.hpRate) {
            this.hp += this.param[MAXHP] / item.hpRate
        }
        if (item.addStates) {
            for (let state of item.addStates) {
                this.addState(state)
            }
        }
        if (item.removeStates) {
            for (let state of item.removeStates) {
                this.removeState(state)
            }
        }
        this.removeItem(itemClass)
    }

    hasState(stateClass) {
        return this.states.find(state => state instanceof stateClass)
    }

    addState(stateClass) {
        const hasState = this.hasState(stateClass)
        if (!hasState) {
            const instance = new stateClass()
            this.states.push(instance)
        }
    }

    removeState(stateClass) {
        const index = this.states.findIndex(state => state instanceof stateClass)
        if (index != -1) {
            this.states.splice(index, 1)
        }
    }

    equip(itemClass, bool) {
        const inventory = this.getItem(itemClass)
        if (!inventory) {
            return {
                msg: `The item ${itemClass.name} is not in inventory`,
                id: 'ITEM_NOT_INVENTORY'
            }
        }
        if (itemClass._type == 'item') {
            return {
                msg: `The item ${itemClass.name} is not a weapon or armor`,
                id: 'INVALID_ITEM_TO_EQUIP'
            }
        }
        const { item } = inventory
        if (item.equipped && bool) {
            return {
                msg: `The item ${itemClass.name} is already equiped`,
                id: 'ITEM_ALREADY_EQUIPED'
            }
        }
        item.equipped = bool
        this.equipments.push(item)
    }

    learnSkill(skill) {
        const instance = new skill()
        this.skills.push(instance)
    }

    applyDamage(otherPlayer: Player, fn: Function) {
       this.hp = fn(otherPlayer.param, this.param)
    }

    recovery({ hp, sp }: { hp?: number, sp?: number }) {
        if (hp) this.hp = this.param[MAXHP] * hp
        if (sp) this.sp = this.param[MAXSP] * sp
    }

    allRecovery() {
        this.recovery({ hp: 1, sp: 1 })
    }

    syncChanges(player?) {
        this._eventChanges()
        if (this.paramsChanged.size == 0) return
        const params = {}
        this.paramsChanged.forEach(param => {
            params[param] = this[param] 
        });
        (player || this)._emit('changeParam', {
            playerId: this.playerId,
            params,
            type: this.type
        })
        this.paramsChanged.clear()
    }

    showText(msg: string, choices?: any[]) {
        const gui = new DialogGui(this)
        this._gui[gui.id] = gui
        return gui.open(msg, choices)
    }

    showChoices(msg: string, choices: { text: string, value: any }[]) {
        return this
            .showText(msg, choices)
            .then((indexSelected: number) => {
                if (!choices[indexSelected]) return null
                return choices[indexSelected]
            })
    }

    showEffect() {
        this._emit('player.callMethod', { 
            objectId: this.playerId,
            name: 'addEffect',
            params: []
        })
    }

    gui(guiId: string) {
        const gui = new Gui(guiId, this)
        this._gui[guiId] = gui
        return gui
    }

    removeGui(guiId: string, data: any) {
        if (this._gui[guiId]) {
            this._gui[guiId].close(data)
            delete this._gui[guiId]
        }
    }

    setVariable(key, val) {
        this.variables.set(key, val)
    }

    getVariable(key) {
        return this.variables.get(key)
    }

    removeVariable(key) {
        return this.variables.delete(key)
    }

    setActor(actorClass) {
        const actor = new actorClass()
        this.name  = actor.name
        this.initialLevel = actor.initialLevel
        this.finalLevel = actor.finalLevel
        this.expCurve = actor.expCurve
        for (let param in actor.parameters) {
            this.addParameter(param, actor.parameters[param])
        }
        for (let item of actor.startingEquipment) {
            this.addItem(item)
            this.equip(item, true)
        }
        this.setClass(actor.class)
    }

    private _getMap(id) {
        return RpgCommonMap.buffer.get(id)
    }

    public _emit(key, value) {
        if (this.socket) this.socket.emit(key, value) 
    }

    private _expForLevel(level) {
        const {
            basis,
            extra,
            accelerationA,
            accelerationB
        } = this.expCurve
        return Math.round(basis * (Math.pow(level - 1, 0.9 + accelerationA / 250)) * level * (level + 1) / (6 + Math.pow(level, 2) / 50 / accelerationB) + (level - 1) * extra)
    }

    public execMethod(methodName: string, methodData = []) {
        const ret = this[methodName](...methodData)
        const sync = () => {
            const player: any = methodData[0]
            if (player instanceof Player) {
                player.syncChanges()
            }
            else {
                this.syncChanges()
            }
        }

        if (isPromise(ret)) {
            ret.then(sync)
        }
        else {
            sync()
        }
    }

    private _triggerHook(name, val?) {
        if (this[name]) this[name](val)
        this._emit('Player.' + name, val)
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