import { merge, RpgClassDatabase, Data } from './common'
import { ISkill } from './skill'
import { EfficiencyOptions } from './interfaces/efficiency'

interface ClassOptions extends EfficiencyOptions, Data {
    equippable?: any[]
    /** 
     * Indicate which skill will be learned when the level is reached
     * 
     * ```ts
     * import { Fire } from 'my-database/skills/fire'
     * 
     * skillsToLearn: [{ level: 5, skill: Fire }]
     * ```
     * 
     * @prop {Array<{ level: number, skill: SkillClass }>} [skillsToLearn]
     * @memberof Class
     * */
    skillsToLearn?: [
        { level: number, skill: RpgClassDatabase<ISkill> }
    ]
}

export function Class(options: ClassOptions) {
    return merge(options, 'class')
}