import { merge } from './common'

export interface ISkill {
    onUse()
}

export interface SkillOptions {
    name: string
    description?: string
    spCost?: number
    power?: number
    elements?: any[]
    addStates?: any[]
    removeStates?: any[]
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