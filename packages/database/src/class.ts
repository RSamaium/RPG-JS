import { merge, RpgClassDatabase, Data } from './common'
import { ISkill } from './skill'
import { EfficiencyOptions } from './interfaces/efficiency'

interface ClassOptions extends EfficiencyOptions, Data {
    equippable?: any[]
    skillsToLearn?: [
        { level: number, skill: RpgClassDatabase<ISkill> }
    ]
}

export function Class(options: ClassOptions) {
    return merge(options, 'class')
}