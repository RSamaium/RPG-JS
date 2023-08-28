import { Utils } from '@rpgjs/common'
import { 
    MAXHP, 
    MAXSP,
} from '../presets'

const { 
    isString
} = Utils

export class ParameterManager {

    private _paramsModifier: {
        [key: string]: {
            value?: number,
            rate?: number
        }
    } = {}

    private _parameters: Map<string, {
        start: number,
        end: number
    }>

    private _hp = 0
    private _sp = 0
    private _exp: number = 0
    private _level: number = 0

     /** 
     * ```ts
     * player.initialLevel = 5
     * ``` 
     * 
     * @title Set initial level
     * @prop {number} player.initialLevel
     * @default 1
     * @memberof ParameterManager
     * */
    public initialLevel:number = 1

    /** 
     * ```ts
     * player.finalLevel = 50
     * ``` 
     * 
     * @title Set final level
     * @prop {number} player.finalLevel
     * @default 99
     * @memberof ParameterManager
     * */
    public finalLevel:number = 99

    /** 
     * With Object-based syntax, you can use following options:
     * - `basis: number`
     * - `extra: number`
     * - `accelerationA: number`
     * - `accelerationB: number`
     * @title Change Experience Curve
     * @prop {object} player.expCurve
     * @default 
     *  ```ts
     * {
     *      basis: 30,
     *      extra: 20,
     *      accelerationA: 30,
     *      accelerationB: 30
     * }
     * ```
     * @memberof ParameterManager
     * */
    public expCurve: { 
        basis: number,
        extra: number,
        accelerationA: number
        accelerationB: number
    }
    
    /** 
     * Changes the health points
     * - Cannot exceed the MaxHP parameter
     * - Cannot have a negative value
     * - If the value is 0, a hook named `onDead()` is called in the RpgPlayer class.
     * 
     * ```ts
     * player.hp = 100
     * ``` 
     * @title Change HP
     * @prop {number} player.hp
     * @default MaxHPValue
     * @memberof ParameterManager
     * */
    set hp(val: number) {
        if (val > this.param[MAXHP]) {
            val = this.param[MAXHP]
        }
        else if (val <= 0) {
            this['execMethod']('onDead') 
            val = 0
        }
        this._hp = val
    }

    get hp(): number {
        return this._hp
    }

    /** 
     * Changes the skill points
     * - Cannot exceed the MaxSP parameter
     * - Cannot have a negative value
     * 
     * ```ts
     * player.sp = 200
     * ``` 
     * @title Change SP
     * @prop {number} player.sp
     * @default MaxSPValue
     * @memberof ParameterManager
     * */
    set sp(val: number) {
        if (val > this.param[MAXSP]) {
            val = this.param[MAXSP]
        }
        this._sp = val
    }

    get sp(): number {
        return this._sp
    }

    /** 
     * Changing the player's experience. 
     * ```ts
     * player.exp += 100
     * ```
     * 
     * Levels are based on the experience curve.
     * 
     * ```ts
     * console.log(player.level) // 1
     * console.log(player.expForNextlevel) // 150
     * player.exp += 160
     * console.log(player.level) // 2
     * ```
     * 
     * @title Change Experience
     * @prop {number} player.exp
     * @default 0
     * @memberof ParameterManager
     * */
    set exp(val: number) {
        this._exp = val
        const lastLevel = this.level
        while (this.expForNextlevel < this._exp) {
            this.level += 1
        }
        //const hasNewLevel = player.level - lastLevel
    }

    get exp(): number {
        return this._exp
    }

    /** 
     * Changing the player's level. 
     * 
     * ```ts
     * player.level += 1
     * ``` 
     * 
     * The level will be between the initial level given by the `initialLevel` and final level given by `finalLevel`
     * 
     * ```ts
     * player.finalLevel = 50
     * player.level = 60 
     * console.log(player.level) // 50
     * ```
     * 
     * @title Change Level
     * @prop {number} player.level
     * @default 1
     * @memberof ParameterManager
     * */
    set level(val: number) {
        const lastLevel = this._level
        if (this.finalLevel && val > this.finalLevel) {
            val = this.finalLevel
        }
        if (this._class) {
            for (let i = this._level ; i <= val; i++) {
                for (let skill of this._class.skillsToLearn) {
                    if (skill.level == i) {
                        this['learnSkill'](skill.skill)
                    }
                }
            }
        }
        const hasNewLevel = val - lastLevel
        if (hasNewLevel > 0) {
            this['execMethod']('onLevelUp', <any>[hasNewLevel])   
        }
        this._level = val
    }

    get level(): number {
        return this._level
    }

     /** 
     * ```ts
     * console.log(player.expForNextlevel) // 150
     * ```
     * @title Experience for next level ?
     * @prop {number} player.expForNextlevel
     * @readonly
     * @memberof ParameterManager
     * */
    get expForNextlevel(): number {
        return this._expForLevel(this.level + 1)
    }

    /** 
     * Read the value of a parameter. Put the name of the parameter.
     * 
     * ```ts
     * import { Presets } from '@rpgjs/server'
     * 
     * const { MAXHP } = Presets 
     * 
     * console.log(player.param[MAXHP])
     * ```
     * 
     * > Possible to use the `player.getParamValue(name)` method instead
     * @title Get Param Value
     * @prop {object} player.param
     * @readonly
     * @memberof ParameterManager
     * */
    get param() {
        const obj = {}
        this._parameters.forEach((val, name) => {
            obj[name] = this.getParamValue(name)
        })
        return obj
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

    /** 
     * Changes the values of some parameters
     * 
     * > It is important that these parameters have been created beforehand with the `addParameter()` method.
     * > By default, the following settings have been created: 
     * - maxhp
     * - maxsp
     * - str
     * - int
     * - dex
     * - agi
     * 
     * **Object Key**
     * 
     * The key of the object is the name of the parameter
     * 
     * > The good practice is to retrieve the name coming from a constant
     * 
     * **Object Value**
     * 
     * The value of the key is an object containing: 
     * ``` 
     * {
     *   value: number,
     *   rate: number
     * }
     * ```
     * 
     * - value: Adds a number to the parameter
     * - rate: Adds a rate to the parameter
     * 
     * > Note that you can put both (value and rate)
     * 
     * In the case of a state or the equipment of a weapon or armor, the parameters will be changed but if the state disappears or the armor/weapon is de-equipped, then the parameters will return to the initial state.
     * 
     * @prop {Object} [paramsModifier]
     * @example
     * 
     * ```ts
     * import { Presets } from '@rpgjs/server'
     * 
     * const { MAXHP } = Presets
     * 
     * player.paramsModifier = {
     *      [MAXHP]: {
     *          value: 100
     *      }
     * }
     * ```
     * 
     * 1. Player has 741 MaxHp
     * 2. After changing the parameter, he will have 841 MaxHp
     * 
     * @title Set Parameters Modifier
     * @prop {number} paramsModifier
     * @memberof ParameterManager
     * */
    set paramsModifier(val: { 
        [key: string]: {
            value?: number,
            rate?: number
        }
    }) {
        this._paramsModifier = val
        this.changeRoomState('param')
    }

    get parameters() {
        return this._parameters
    }

    set parameters(val) {
        this._parameters = val
    }

    private _expForLevel(level: number): number {
        const {
            basis,
            extra,
            accelerationA,
            accelerationB
        } = this.expCurve
        return Math.round(basis * (Math.pow(level - 1, 0.9 + accelerationA / 250)) * level * (level + 1) / (6 + Math.pow(level, 2) / 50 / accelerationB) + (level - 1) * extra)
    }

    private getParam(name: string) {
        const features = this._parameters.get(name)
        if (!features) {
            throw `Parameter ${name} not exists. Please use addParameter() before`
        }
        return features
    }

    getParamValue(name: string): number | never {
        const features = this.getParam(name)
        let curveVal = Math.floor((features.end - features.start) * ((this.level-1) / (this.finalLevel - this.initialLevel))) + features.start
        const modifier = this.paramsModifier[name]
        if (modifier) {
            if (modifier.rate) curveVal *= modifier.rate
            if (modifier.value) curveVal += modifier.value
        }
        return curveVal
    }

    /** 
     * Give a new parameter. Give a start value and an end value. 
     * The start value will be set to the level set at `player.initialLevel` and the end value will be linked to the level set at `player.finalLevel`.
     * 
     * ```ts
     * const SPEED = 'speed'
     * 
     * player.addParameter(SPEED, {
     *     start: 10,
     *     end: 100
     * })
     * 
     * player.param[SPEED] // 10
     * player.level += 5
     * player.param[SPEED] // 14
     * ```
     * 
     * @title Add custom parameters
     * @method player.addParameter(name,curve)
     * @param {name} name 
     * @param {object} curve Scheme of the object: { start: number, end: number }
     * @returns {void}
     * @memberof ParameterManager
     * */
    addParameter(name: string, { start, end }: { start: number, end: number }): void {
        this._parameters.set(name, {
            start,
            end
        })
        const maxHp = this.param[MAXHP]
        const maxSp = this.param[MAXSP]
        if (name == MAXHP && this.hp > maxHp) {
            this.hp = maxHp // forcing hp not to exceed maxp 
        }
        else if (name == MAXSP && this.sp > maxSp) {
            this.sp = maxSp
        }
        this.changeRoomState('param.' + name)
    }

    /** 
     * Gives back in percentage of health points to skill points
     * 
     * ```ts
     * import { Presets } from '@rpgjs/server'
     * 
     * const { MAXHP } = Presets 
     * 
     * console.log(player.param[MAXHP]) // 800
     * player.hp = 100
     * player.recovery({ hp: 0.5 }) // = 800 * 0.5
     * console.log(player.hp) // 400
     * ```
     * 
     * @title Recovery HP and/or SP
     * @method player.recovery(params)
     * @param {object} params Scheme of the object: { hp: number, sp: number }. The values of the numbers must be in 0 and 1
     * @returns {void}
     * @memberof ParameterManager
     * */
    recovery({ hp, sp }: { hp?: number, sp?: number }) {
        if (hp) this.hp = this.param[MAXHP] * hp
        if (sp) this.sp = this.param[MAXSP] * sp
    }

    /** 
     * restores all HP and SP
     * 
     * ```ts
     * import { Presets } from '@rpgjs/server'
     * 
     * const { MAXHP, MAXSP } = Presets 
     * 
     * console.log(player.param[MAXHP], player.param[MAXSP]) // 800, 230
     * player.hp = 100
     * player.sp = 0
     * player.allRecovery()
     * console.log(player.hp, player.sp) // 800, 230
     * ```
     * 
     * @title All Recovery
     * @method player.allRecovery()
     * @returns {void}
     * @memberof ParameterManager
     * */
    allRecovery(): void {
        this.recovery({ hp: 1, sp: 1 })
    }
}

export interface ParameterManager {
    _class,
    $schema,
    changeRoomState(key: string): void
}