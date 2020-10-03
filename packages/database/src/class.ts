import { merge } from './common'

interface RpgClassDatabase {
    new ()
}

interface ClassOptions {
    name: string,
    equippable?: any[],
    stateEfficency?: any[],
    elementEfficency?: any[],
    skillsToLearn?: [
        { level: number, skill: RpgClassDatabase }
    ]
}

export function Class(options: ClassOptions) {
    return merge(options, 'class')
}