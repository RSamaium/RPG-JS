import { merge, RpgClassDatabase } from './common'
import { ISkill } from './skill'

interface ClassOptions {
    name: string,
    equippable?: any[],
    stateEfficency?: any[],
    elementEfficency?: any[],
    skillsToLearn?: [
        { level: number, skill: RpgClassDatabase<ISkill> }
    ]
}

export function Class(options: ClassOptions) {
    return merge(options, 'class')
}