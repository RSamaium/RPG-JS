import { RpgCommonMap, RpgCommonPlayer, Utils }  from '@rpgjs/common'
import { Effect } from '@rpgjs/database'
import { StrategyBroadcasting } from './decorators/strategy-broadcasting'
import { Gui, DialogGui, MenuGui, ShopGui } from './Gui'
import { Query } from './Query'
import { ItemLog, SkillLog, Log } from './logs'
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
} from './presets'

const { 
    isPromise, 
    random, 
    isArray, 
    isObject, 
    isString, 
    isInstanceOf,
    arrayUniq
} = Utils

@StrategyBroadcasting([
    {
        params: [
            'hp', 
            'sp', 
            'gold', 
            'items', 
            'level', 
            'exp', 
            'param', 
            'name', 
            '_class', 
            'expForNextlevel',
            'skills',
            'states',
            'equipments'
        ],
        query: Query.getPlayer
    }
])
export default class Player extends RpgCommonPlayer {

    public readonly type: string = 'player'

    private _gold = 0
    private _hp = 0
    private _sp = 0 
    private _name = ''
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
    private _effects: Effect[] = []
    private variables: Map<string, any> = new Map()
    private _parameters: Map<string, {
        start: number,
        end: number,
        extraValue: number
    }> = new Map()
    public _statesEfficiency: { rate: number, state: any }[] = []
    public _elementsEfficiency: { rate: number, element: any }[] = []

    protected paramsChanged: Set<string> = new Set()
    private _gui: { [id: string]: Gui } = {}
    public socket: any
    public server: any
    public map: string = ''
    public events: any[] = []
    public param: any 
    public $broadcast: any // decorator StrategyBroadcasting

    constructor(gamePlayer?, options?, props?) {
        super(gamePlayer, options, props)
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
        this.socket.on('gui.interaction', ({ guiId, name, data }) => {
            if (this._gui[guiId]) {
                this._gui[guiId].emit(name, data)
                this.syncChanges()
            }
        })
        this.socket.on('gui.exit', ({ guiId, data }) => {
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

    set gold(val) {
        if (val < 0) {
            val = 0
        }
        this._gold = val
        this.paramsChanged.add('gold')
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
        return [...new Set(elements)]
    }

    get effects(): Effect[] {
        const getEffects = (prop) => {
            return this[prop]
                .map(el => el.effects || [])
                .reduce((acc, val) => acc.concat(val), [])
        }
        return arrayUniq([
            ...this._effects,
            ...getEffects('states'),
            ...getEffects('items')
        ])
    }

    set effects(val) {
        if (isArray(val)) {
            this._effects = val
        }
        else {
            this._effects = [...this._effects, val]
        }
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

    startBattle(enemies: [{ enemy: any, level: number }]) {
        return this.server.getScene('battle').create(this, enemies)
    }

    setClass(_class) {
        this._class = new _class()
        if (!this._class.$broadcast) this._class.$broadcast = ['name', 'description']
        this.paramsChanged.add('_class')
    }

    getItem(itemClass) {
        const index = this._getItemIndex(itemClass)
        return this.items[index]
    }

    _getItemIndex(itemClass) {
        return this.items.findIndex(it => {
            if (isString(itemClass)) {
                return it.item.id == itemClass
            }
            return isInstanceOf(it.item, itemClass)
        })
    }

    addItem(itemClass, nb = 1): { item: any, nb: number } {
        let itemIndex = this._getItemIndex(itemClass)
        if (itemIndex != -1) {
            this.items[itemIndex].nb += nb
        }
        else {
            const instance = new itemClass()
            if (!instance.$broadcast) instance.$broadcast = ['name', 'description', 'price', 'consumable']
            this.items.push({
                item: instance,
                nb
            })
            itemIndex = this.items.length - 1
        }
        this.paramsChanged.add('items')
        return this.items[itemIndex]
    }

    removeItem(itemClass, nb = 1): { item: any, nb: number } | undefined {
        const itemIndex: number = this._getItemIndex(itemClass)
        if (itemIndex == -1) {
            throw ItemLog.notInInventory(itemClass)
        }
        const currentNb = this.items[itemIndex].nb
        if (currentNb - nb <= 0) {
            this.items.splice(itemIndex, 1)
        }
        else {
            this.items[itemIndex].nb -= nb
        }
        this.paramsChanged.add('items')
        return this.items[itemIndex]
    }

    buyItem(itemClass, nb = 1): { item: any, nb: number } {
        if (isString(itemClass)) itemClass = this.databaseById(itemClass)
        if (!itemClass.price) {
            throw ItemLog.haveNotPrice(itemClass)
        }
        const totalPrice = nb * itemClass.price
        if (this.gold < totalPrice) {
            throw ItemLog.notEnoughGold(itemClass, nb)
        }
        this.gold -= totalPrice
        return this.addItem(itemClass, nb)
    }

    sellItem(itemClass, nbToSell = 1): { item: any, nb: number } {
        if (isString(itemClass)) itemClass = this.databaseById(itemClass)
        const inventory = this.getItem(itemClass)
        if (!inventory) {
            throw ItemLog.notInInventory(itemClass)
        }
        const { item, nb } = inventory
        if (nb - nbToSell < 0) {
            throw ItemLog.tooManyToSell(itemClass, nbToSell, nb)
        }
        this.gold += (itemClass.price / 2) * nbToSell
        this.removeItem(itemClass, nbToSell)
        return inventory
    } 

    useItem(itemClass) {
        const inventory = this.getItem(itemClass)
        if (this.hasEffect(Effect.CAN_NOT_ITEM)) {
            throw ItemLog.restriction(itemClass)
        }
        if (!inventory) {
            throw ItemLog.notInInventory(itemClass)
        }
        const { item } = inventory
        if (item.consumable === false) {
            throw ItemLog.notUseItem(itemClass)
        }
        const hitRate = item.hitRate || 1
        if (Math.random() > hitRate) {
            this.removeItem(itemClass)
            throw ItemLog.chanceToUseFailed(itemClass)
        }
        if (item.hpValue) {
            this.hp += item.hpValue
        }
        if (item.hpRate) {
            this.hp += this.param[MAXHP] / item.hpRate
        }
        this.applyStates(this, item)
        this.removeItem(itemClass)
    }

    private applyStates(player: Player, { addStates, removeStates }) {
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
            if (!instance.$broadcast) instance.$broadcast = ['name', 'description', 'effects']
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

    equip(itemClass, bool) {
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
        this.applyStates(this, item)
        this.equipments.push(item)
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

    useSkill(skillClass, otherPlayer?: Player | Player[]) {
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
        this.sp -= skill.spCost
        const hitRate = skill.hitRate || 1
        if (Math.random() > hitRate) {
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
        return skill
    }

    applyDamage(otherPlayer: Player, skill: any): { 
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

    coefficientElements(otherPlayer: Player): number {
        const atkPlayerElements: any = otherPlayer.elements
        const playerElements: any = this.elementsEfficiency
        let coefficient = 0

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

    syncChanges(player?: Player) {
        this._eventChanges()
        if (this.paramsChanged.size == 0) return
        const strategyBroadcasting = this.$broadcast || []
        const params = {}

        const deepSerialize = (val) => {
            if (val == undefined) {
                return val
            }
            if (isArray(val)) {
                const newArray: any = []
                for (let item of val) {
                    newArray.push(deepSerialize(item))
                }
                return newArray
            }
            if (val.$broadcast) {
                const obj: any = {}
                for (let param of val.$broadcast) {
                    obj[param] = val[param]
                }
                obj.id = val.id
                return deepSerialize(obj)
            }
            if (isObject(val)) {
                const newObj = Object.assign({}, val)
                for (let key in newObj) {
                    newObj[key] = deepSerialize(val[key])
                }
                return newObj
            }
            return val
        }

        for (let strategy of strategyBroadcasting) {
            this.paramsChanged.forEach(param => {
                if (!strategy.params.includes(param)) {
                    return
                }
                if (param == 'param') {
                    this._parameters.forEach((val, key) => {
                        params[key] = this.param[key]
                    })
                }
                else {
                    let val = this[param]
                    params[param] = deepSerialize(val)
                }
            });
            let query = strategy.query(player || this)
            if (!isArray(query)) {
                query = [query]
            }
            for (let players of query) {
                players._emit('player.changeParam', {
                    playerId: this.playerId,
                    params,
                    type: this.type
                })
            }
        }
        this.paramsChanged.clear()
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

    status() {

    }

    private databaseById(id: string) {
        return this.server.database[id]
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
        if (!this[methodName]) {
            return
        }
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