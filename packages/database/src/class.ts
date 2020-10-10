import { merge, RpgClassDatabase } from './common'
import { ISkill } from './skill'
import { EfficiencyOptions } from './efficiency'

interface ClassOptions extends EfficiencyOptions {
    name: string
    equippable?: any[]
    skillsToLearn?: [
        { level: number, skill: RpgClassDatabase<ISkill> }
    ]
}

export function Class(options: ClassOptions) {
    return merge(options, 'class')
}