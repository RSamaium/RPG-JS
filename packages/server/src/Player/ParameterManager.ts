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
    public initialLevel:number = 1
    public finalLevel:number = 99
    public expCurve: { 
        basis: number,
        extra: number,
        accelerationA: number
        accelerationB: number
    }
    
    set hp(val) {
        if (val > this.param[MAXHP]) {
            val = this.param[MAXHP]
        }
        else if (val <= 0) { 
            this['_triggerHook']('onDead')
            val = 0
        }
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

    set paramsModifier(val: any) {
        this._paramsModifier = val
    }

    get parameters() {
        return this._parameters
    }

    set parameters(val) {
        this._parameters = val
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

    addParameter(name: string, { start, end }: { start: number, end: number }) {
        this._parameters.set(name, {
            start,
            end
        })
    }

    recovery({ hp, sp }: { hp?: number, sp?: number }) {
        if (hp) this.hp = this.param[MAXHP] * hp
        if (sp) this.sp = this.param[MAXSP] * sp
    }

    allRecovery() {
        this.recovery({ hp: 1, sp: 1 })
    }
}

export interface ParameterManager {
    _class
}