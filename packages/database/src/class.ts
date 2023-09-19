import { merge, RpgClassDatabase, Data } from './common'
import { ISkill } from './skill'
import { EfficiencyOptions } from './interfaces/efficiency'

declare type RpgPlayer = any;

export enum ClassHooks {
    onSet = 'onSet',
    canEquip = 'canEquip'
}

export interface ClassCanEquip {
    canEquip(item: any, player: RpgPlayer): boolean
}

export interface ClassOnSet {
    onSet(player: RpgPlayer): void
}

export interface ClassOptions extends EfficiencyOptions, Data {
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