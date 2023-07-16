import { Utils }  from '@rpgjs/common'
import { Effect } from '@rpgjs/database'
import { ParameterManager } from './ParameterManager'

import {
    MAXHP, 
    MAXSP
} from '../presets'

const { 
    arrayUniq,
    arrayFlat,
    applyMixins
} = Utils

export class EffectManager {
    
    _effects: Effect[]

    // TODO
    applyEffect(item) {
        if (item.hpValue) {
            this.hp += item.hpValue
        }
        if (item.hpRate) {
            this.hp += this.param[MAXHP] * item.hpRate
        }
        if (item.spValue) {
            this.sp += item.spValue
        }
        if (item.spRate) {
            this.sp += this.param[MAXSP] * item.spRate
        }
    }

    /** 
     * ```ts
     * import { Effect } from '@rpgjs/database'
     * 
     * const bool = player.hasEffect(Effect.CAN_NOT_SKILL)
     * ```
     * 
     * @title Has Effect
     * @method player.hasEffect(effect)
     * @param {Effect} effect
     * @returns {boolean}
     * @memberof EffectManager
     * */
    hasEffect(effect: Effect): boolean {
        return this.effects.includes(effect)
    }

    /** 
     * Retrieves a array of effects assigned to the player, state effects and effects of weapons and armors equipped with the player's own weapons.
     * 
     * ```ts
     * console.log(player.effects)
     * ``` 
     * @title Get Effects
     * @prop {Array<Effect>} player.effects
     * @memberof EffectManager
     * */
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

    /** 
     * Assigns effects to the player. If you give a array, it does not change the effects of the player's states and armor/weapons equipped.
     * 
     * ```ts
     * import { Effect } from '@rpgjs/database'
     * 
     * player.effects = [Effect.CAN_NOT_SKILL]
     * ``` 
     * @title Set Effects
     * @prop {Array<Effect>} player.effects
     * @memberof EffectManager
     * */
    set effects(val) {
        this._effects = val
    }
}

applyMixins(EffectManager, [ParameterManager])

export interface EffectManager extends ParameterManager { }

