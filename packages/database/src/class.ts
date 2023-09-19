import { merge, RpgClassDatabase, Data } from './common'
import { ISkill } from './skill'
import { EfficiencyOptions } from './interfaces/efficiency'

export interface CanEquip {
    canEquip(item: any, player: RpgPlayer): boolean
}

export interface ClassOptions extends EfficiencyOptions, Data {
    /**
     * Indicate which equipment can be used by the class
     * 
     * ```ts
     * import { Sword } from 'my-database/equipments/sword'
     * 
     * equippable: [Sword]
     * ```
     * 
     * @prop {Array<EquipmentClass>} [equippable]
     * @memberof Class
     * @since 4.0.1
     */
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