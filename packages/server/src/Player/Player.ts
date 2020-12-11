import { RpgCommonMap, RpgCommonPlayer, Utils }  from '@rpgjs/common'
import { Effect } from '@rpgjs/database'
import { Gui, DialogGui, MenuGui, ShopGui } from '../Gui'
import { ItemLog, SkillLog, Log } from '../logs'
import { ItemManager } from './ItemManager'
import { GoldManager } from './GoldManager'
import { World } from '@rpgjs/sync-server'

import { 
    MAXHP, 
    MAXSP,
    STR,
    ATK,
    INT,
    DEX,
    AGI,
    PDEF,
    SDEF,
    MAXHP_CURVE, 
    MAXSP_CURVE,
    STR_CURVE,
    INT_CURVE,
    DEX_CURVE,
    AGI_CURVE
} from '../presets'

const { 
    isPromise, 
    random, 
    isArray, 
    isObject, 
    isString, 
    isInstanceOf,
    arrayUniq,
    arrayFlat,
    applyMixins
} = Utils

export class RpgPlayer extends RpgCommonPlayer {

    public readonly type: string = 'player'

    static schemas = {
        hp: Number,
        graphic: String,
        action: Number,
        map: String,
        speed: Number,
        canMove: Boolean,
        width: Number,
        height: Number,
        wHitbox: Number,
        hHitbox: Number
    }
    
    private _hp = 0
    private _sp = 0 
    private _name
    private skills: any[] = []

    items: any[] = []
    
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
    private _effects: Effect[] = []
    private variables: Map<string, any> = new Map()
    private _parameters: Map<string, {
        start: number,
        end: number
    }> = new Map()
    private _statesEfficiency: { rate: number, state: any }[] = []
    private _elementsEfficiency: { rate: number, element: any }[] = []
    private _paramsModifier: {
        [key: string]: {
            value?: number,
            rate?: number
        }
    } = {}

    paramsChanged: Set<string> = new Set()
    private _gui: { [id: string]: Gui } = {}
    public _socket: any
    public server: any
    public map: string = ''
    public events: any[] = []
    public param: any 
    public $broadcast: any // decorator StrategyBroadcasting

    _rooms = []

    constructor(gameEngine?, options?, props?) {
        super(gameEngine, options, props)
        this.gold = 0
        this.exp = 0
        this.level = this.initialLevel
        this.param = new Proxy({}, {
            get: (obj, prop: string) => this.getParamValue(prop), 
            set: () => {
                console.log("You cannot change the value because the parameter is linked to the parameter's curve")
                return false
            }
        })
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
        //this.paramsChanged.add('name')
    }

    

    set hp(val) {
        if (val > this.param[MAXHP]) {
            val = this.param[MAXHP]
        }
        else if (val <= 0) { 
            this._triggerHook('onDead')
            val = 0
        }
        this._hp = val
        this.paramsChanged.add('hp')
    }

    get hp() {
        return this._hp
    }

    set sp(val) {
        if (val > this.param[MAXSP]) {
            val = this.param[MAXSP]
        }
        this._sp = val
        this.paramsChanged.add('sp')
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
        this.paramsChanged.add('exp')
        //const hasNewLevel = player.level - lastLevel
    }

    get exp(): number {
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
        this.paramsChanged.add('level')
        this.paramsChanged.add('expForNextlevel')
        this.paramsChanged.add('param')
    }

    get level(): number {
        return this._level
    }

    get expForNextlevel(): number {
        return this._expForLevel(this.level + 1)
    }

    private getParamItem(name) {
        let nb = 0
        for (let item of this.equipments) {
            nb += item[name] || 0
        }
        const modifier = this.paramsModifier[name]
        if (modifier) {
            if (modifier.value) nb += modifier.value
            if (modifier.rate) nb *= modifier.rate
        }
        return nb
    }

    get atk(): number {
        return this.getParamItem(ATK)
    }

    get pdef(): number {
        return this.getParamItem(PDEF)
    }

    get sdef(): number {
        return this.getParamItem(SDEF)
    }

    private getFeature(name, prop): any {
        const array = {}
        for (let item of this.equipments) {
            if (item[name]) {
                for (let feature of item[name]) {
                    const { rate } = feature
                    const instance = feature[prop]
                    const cache = array[instance.id]
                    if (cache && cache.rate >= rate) continue
                    array[instance.id] = feature
                }
            }
        }
        return Object.values(array)
    }

    get elementsDefense(): { rate: number, element: any }[] {
        return this.getFeature('elementsDefense', 'element')
    }

    get statesDefense(): { rate: number, state: any }[] {
        return this.getFeature('statesDefense', 'state')
    }

    get statesEfficiency() {
        return this._statesEfficiency
    }

    set statesEfficiency(val) {
        this._statesEfficiency = val
    }

    get elementsEfficiency(): { rate: number, element: any }[] {
        if (this._class) {
            return <any>[...this._elementsEfficiency, ...this._class.elementsEfficiency]
        }
        return this._elementsEfficiency
    }

    set elementsEfficiency(val) {
        this._elementsEfficiency = val
    }

    get elements() {
        let elements: any = []
        for (let item of this.equipments) {
            if (item.elements) {
                elements = [...elements, ...item.elements]
            }
        }
        return arrayUniq(elements)
    }

    get effects(): any[] {
        const getEffects = (prop) => {
            return arrayFlat(this[prop]
                .map(el => el.effects || []))
        }
        return arrayUniq([
            ...this._effects,
            ...getEffects('states'),
            ...getEffects('equipments')
        ])
    }

    set effects(val) {
        this._effects = val
    }

    get paramsModifier() {
        const params = {}
        const paramsAvg = {}
        const changeParam = (paramsModifier) => {
            for (let key in paramsModifier) {
                const { rate, value } = paramsModifier[key]
                if (!params[key]) params[key] = { rate: 0, value: 0 }
                if (!paramsAvg[key]) paramsAvg[key] = 0
                if (value) params[key].value += value
                if (rate !== undefined) params[key].rate += rate
                paramsAvg[key]++
            }
        }
        const getModifier = (prop) => {
            if (!isString(prop)) {
                changeParam(prop)
                return
            }
            for (let el of this[prop]) {
                if (!el.paramsModifier) continue
                changeParam(el.paramsModifier)
            }
        }
        getModifier(this._paramsModifier)
        getModifier('states')
        getModifier('equipments')
        for (let key in params) {
            params[key].rate /= paramsAvg[key]
        }
        return params
    }

    set paramsModifier(val: any) {
        this._paramsModifier = val
    }

    addParameter(name: string, { start, end }: { start: number, end: number }) {
        this._parameters.set(name, {
            start,
            end
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
        const modifier = this.paramsModifier[name]
        if (modifier) {
            if (modifier.value) curveVal += modifier.value
            if (modifier.rate) curveVal *= modifier.rate
        }
        return curveVal
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

    setClass(_class) {
        this._class = new _class()
        if (!this._class.$broadcast) this._class.$broadcast = ['name', 'description']
        this.paramsChanged.add('_class')
    }

   

    private applyEffect(item) {
        if (item.hpValue) {
            this.hp += item.hpValue
        }
        if (item.hpRate) {
            this.hp += this.param[MAXHP] / item.hpRate
        }
        if (item.spValue) {
            this.sp += item.hpValue
        }
        if (item.spRate) {
            this.sp += this.param[MAXHP] / item.hpRate
        }
    }

    private applyStates(player: RpgPlayer, { addStates, removeStates }) {
        if (addStates) {
            for (let { state, rate } of addStates) {
                player.addState(state, rate)
            }
        }
        if (removeStates) {
            for (let { state, rate } of removeStates) {
                player.removeState(state, rate)
            }
        } 
    }

    getState(stateClass) {
        return this.states.find(({ state }) => state instanceof stateClass)
    }

    addState(stateClass, chance = 1): object | null {
        const state = this.getState(stateClass)
        if (!state) {
            if (Math.random() > chance) {
                throw '' // TODO
            }
            //const efficiency = this.findStateEfficiency(stateClass)
            const instance = new stateClass()
            if (!instance.$broadcast) instance.$broadcast = ['name', 'description']
            this.states.push(instance)
            this.applyStates(this, instance)
            this.paramsChanged.add('states')
            return instance
        }
        return null
    }

    removeState(stateClass, chance = 1) {
        const index = this.states.findIndex(state => state instanceof stateClass)
        if (index != -1) {
            if (Math.random() > chance) {
                throw '' // TODO
            }
            this.states.splice(index, 1)
        }
        else {
            throw '' // TODO
        }
        this.paramsChanged.add('states')
    }

    private findStateEfficiency(stateClass) {
        return this.statesEfficiency.find(state => isInstanceOf(state.state, stateClass))
    }

    private hasEffect(effect: Effect): boolean {
        return this.effects.includes(effect)
    }

    equip(itemClass, bool = true) {
        const inventory = this.getItem(itemClass)
        if (!inventory) {
            return ItemLog.notInInventory(itemClass)
        }
        if (itemClass._type == 'item') {
            return ItemLog.invalidToEquiped(itemClass)
        }
        const { item } = inventory
        if (item.equipped && bool) {
            return ItemLog.isAlreadyEquiped(itemClass)
        }
        item.equipped = bool
        if (!bool) {
            const index = this.equipments.findIndex(it => it.id == item.id)
            this.equipments.splice(index, 1)
        }
        else {
            this.equipments.push(item)
        }
        this.paramsChanged.add('equipments')
    }

    getSkill(skillClass) {
        const index = this._getSkillIndex(skillClass)
        return this.skills[index]
    }

    private _getSkillIndex(skillClass) {
        return this.skills.findIndex(skill => {
            if (isString(skill)) {
                return skill.id == skillClass
            }
            return isInstanceOf(skill, skillClass)
        })
    }

    learnSkill(skillClass) {
        const instance = new skillClass()
        if (!instance.coefficient) instance.coefficient = {
            [INT]: 1
        }
        if (!instance.$broadcast) instance.$broadcast = ['name', 'description', 'spCost']
        this.skills.push(instance)
        this.paramsChanged.add('skills')
        return instance
    }

    forgetSkill(skillClass) {
        const index = this._getSkillIndex(skillClass)
        if (index == -1) {
            throw SkillLog.notLearned(skillClass)
        }
        this.skills.splice(index, 1)
        this.paramsChanged.add('skills')
    }

    useSkill(skillClass, otherPlayer?: RpgPlayer | RpgPlayer[]) {
        const skill = this.getSkill(skillClass)
        if (this.hasEffect(Effect.CAN_NOT_SKILL)) {
            throw SkillLog.restriction(skillClass)
        }
        if (!skill) {
            throw SkillLog.notLearned(skillClass)
        }
        if (skill.spCost > this.sp) {
            throw SkillLog.notEnoughSp(skillClass, skill.spCost, this.sp)
        }
        this.sp -= (skill.spCost / (this.hasEffect(Effect.HALF_SP_COST) ? 2 : 1))
        const hitRate = skill.hitRate || 1
        if (Math.random() > hitRate) {
            if (skill.onUseFailed) skill.onUseFailed(this, otherPlayer)
            throw SkillLog.chanceToUseFailed(skillClass)
        }
        if (otherPlayer) {
            let players: any = otherPlayer
            if (!isArray(players)) {
                players = [otherPlayer]
            }
            for (let player of players) {
                this.applyStates(player, skill)
                player.applyDamage(this, skill)
            } 
        }
        if (skill.onUse) skill.onUse(this, otherPlayer)
        return skill
    }

    applyDamage(otherPlayer: RpgPlayer, skill: any): { 
        damage: number, 
        critical: boolean, 
        elementVulnerable: boolean,
        guard: boolean,
        superGuard: boolean
    } {
        const getParam = (player) => {
            const params = {}
            this._parameters.forEach((val, key) => {
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
    }

    coefficientElements(otherPlayer: RpgPlayer): number {
        const atkPlayerElements: any = otherPlayer.elements
        const playerElements: any = this.elementsEfficiency
        let coefficient = 1

        for (let atkElement of atkPlayerElements) {
            const elementPlayer = playerElements.find(el => el.element == atkElement.element)
            const elementPlayerDef = this.elementsDefense.find(el => el.element == atkElement.element)
            if (!elementPlayer) continue
            const fn = this.getFormulas('coefficientElements')
            if (!fn) {
                return coefficient
            }
            coefficient += fn(atkElement, elementPlayer, elementPlayerDef || { rate: 0 })
        }
        return coefficient
    }

    private getFormulas(name) {
        return this.server.damageFormulas[name]
    }

    recovery({ hp, sp }: { hp?: number, sp?: number }) {
        if (hp) this.hp = this.param[MAXHP] * hp
        if (sp) this.sp = this.param[MAXSP] * sp
    }

    allRecovery() {
        this.recovery({ hp: 1, sp: 1 })
    }

    syncChanges() {
        this._eventChanges()
        // Trigger detect changes cycle in @rpgjs/sync-server package
        World.forEachUserRooms(''+this.playerId, (room: any) => {
            if (room) room.$detectChanges()
        })
    }

    showText(msg: string, options: {
        choices?: any[],
        position?,
        fullWidth?: boolean,
        autoClose?: boolean,
        tranparent?: boolean,
        typewriterEffect?: boolean
     } = {}) {
        const gui = new DialogGui(this)
        this._gui[gui.id] = gui
        return gui.open(msg, options)
    }

    showChoices(msg: string, choices: { text: string, value: any }[]) {
        return this
            .showText(msg, {
                choices
            })
            .then((indexSelected: number) => {
                if (!choices[indexSelected]) return null
                return choices[indexSelected]
            })
    }

    callMainMenu() {
        const gui = new MenuGui(this)
        this._gui[gui.id] = gui
        return gui.open()
    }

    callShop(items: any[]) {
        const gui = new ShopGui(this)
        this._gui[gui.id] = gui
        return gui.open(items)
    }

    showEffect() {
        this.emit('player.callMethod', { 
            objectId: this.playerId,
            name: 'addEffect',
            params: []
        })
    }

    showAnimation() {
        this.emit('player.callMethod', { 
            objectId: this.playerId,
            name: 'showAnimation',
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

    status() {

    }

    databaseById(id: string) {
        return this.server.database[id]
    }

    private _getMap(id) {
        return RpgCommonMap.buffer.get(id)
    }

    public emit(key, value) {
        if (this._socket) this._socket.emit(key, value) 
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
        if (!this[methodName]) {
            return
        }
        const ret = this[methodName](...methodData)
        const sync = () => {
            const player: any = methodData[0]
            if (player instanceof RpgPlayer) {
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

export interface RpgPlayer extends ItemManager, GoldManager {}

applyMixins(RpgPlayer, [ItemManager, GoldManager])