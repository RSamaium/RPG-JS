import { merge, Data } from './common'
import { StatesOption } from './interfaces/states'
import { ElementsOption } from './interfaces/elements';

export interface ISkill {
    onUse()
}

export interface SkillOptions extends StatesOption, ElementsOption, Data {
    /** 
     * Indicates how much SP will be removed when the skill is used.
     * 
     * @prop {number} [spCost]
     * @memberof Skill
     * */
    spCost?: number
    /** 
     * Indicates the power of the skill
     * 
     * @prop {number} [power]
     * @memberof Skill
     * */
    power?: number
    /** 
     * The coefficient indicates which parameter influences the skill
     * 
     * ```ts
     * import { Presets } from '@rpgjs/server'
     * 
     * const { ATK } = Presets
     * 
     * coefficient: {
     *      [ATK]: 2
     * }
     * ```
     * 
     * Below, The ATK parameter will be taken into account, added and multiplied by 2.
     * 
     * > It depends on the fight formula. By default, the coefficients are used on ATK, PDEF SDEF, STR, DEX, AGI, INT
     * 
     * @prop {object} [coefficient]
     * @memberof Skill
     * */
    coefficient?: {
        [param: string]: number
    },

     /** 
     * The variance of the damage. For example, if you put `20` and the damage is 500 then the player can lose between 480 and 520 HP.
     * @prop {number} [variance]
     * @memberof Skill
     * */
    variance?: number

    /** 
     * The rate of chance, between 0 and 1 that the skill will take effect
     * @prop {number} [hitRate]
     * @memberof Skill
     * */
    hitRate?: number
}

export function Skill(options: SkillOptions) {
    if (!options.coefficient) options.coefficient = {
        'int': 1
    }
    return merge(options, 'skill')
}