import { Utils }  from '@rpgjs/common'
import { Effect } from '@rpgjs/database'
import { ParameterManager } from './ParameterManager'

import {
    MAXHP, 
} from '../presets'

const { 
    arrayUniq,
    arrayFlat,
    applyMixins
} = Utils

export class EffectManager {
    
    _effects: Effect[]

    applyEffect(item) {
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

    hasEffect(effect: Effect): boolean {
        return this.effects.includes(effect)
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
}

applyMixins(EffectManager, [ParameterManager])

export interface EffectManager extends ParameterManager { }

