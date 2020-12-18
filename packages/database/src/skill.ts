import { merge, Data } from './common'
import { StatesOption } from './interfaces/states'
import { ElementsOption } from './interfaces/elements';

export interface ISkill {
    onUse()
}

export interface SkillOptions extends StatesOption, ElementsOption, Data {
    spCost?: number
    power?: number
    // The coefficient indicates which parameter influences the skill
    coefficient?: {
        [param: string]: number
    },
    variance?: number
    hitRate?: number
}

export function Skill(options: SkillOptions) {   
    return merge(options, 'skill')
}