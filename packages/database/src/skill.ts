import { merge } from './common'

export interface ISkill {
    onUse()
}

export interface SkillOptions {
    name: string
    description?: string
    spCost?: number
    power?: number
    element?: any[]
    stateChange?: any[]
}

export function Skill(options: SkillOptions) {   
    return merge(options, 'skill')
}