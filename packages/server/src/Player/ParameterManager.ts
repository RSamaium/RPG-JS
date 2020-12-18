import { Utils }  from '@rpgjs/common'

import { 
    MAXHP, 
    MAXSP,
} from '../presets'

const { 
    applyMixins,
    isString
} = Utils

export class ParameterManager {

    param: any

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
            this['_triggerHook']('onDead')
            val = 0
        }
        this._hp = val
    }

    get hp(): number {
        return this._hp
    }

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
        if (this.finalLevel && this._level > this.finalLevel) {
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
        if (hasNewLevel > 0) this['_triggerHook']('onLevelUp', hasNewLevel)
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

    set paramsModifier(val: { 
        [key: string]: {
            value?: number,
            rate?: number
        }
    }) {
        this._paramsModifier = val
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

    getParamValue(name: string): number {
        const features = this.getParam(name)
        let curveVal = Math.floor((features.end - features.start) * ((this.level-1) / (this.finalLevel - this.initialLevel))) + features.start
        const modifier = this.paramsModifier[name]
        if (modifier) {
            if (modifier.value) curveVal += modifier.value
            if (modifier.rate) curveVal *= modifier.rate
        }
        return curveVal
    }

    addParameter(name: string, { start, end }: { start: number, end: number }): void {
        this._parameters.set(name, {
            start,
            end
        })
    }

    recovery({ hp, sp }: { hp?: number, sp?: number }) {
        if (hp) this.hp = this.param[MAXHP] * hp
        if (sp) this.sp = this.param[MAXSP] * sp
    }

    allRecovery(): void {
        this.recovery({ hp: 1, sp: 1 })
    }
}

export interface ParameterManager {
    _class
}