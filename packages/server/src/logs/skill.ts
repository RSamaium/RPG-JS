import { Log } from './log'

export class SkillLog {
    static notLearned(skillClass) {
        return new Log('SKILL_NOT_LEARNED', `the skill ${skillClass.name} is not learned`)
    }
    static notEnoughSp(skillClass, skillSp, playerSp) {
        return new Log('NOT_ENOUGH_SP', `not enough SP to use ${skillClass.name} skill. ${skillSp} Skill'SP is is greater than ${playerSp} Player'SP`)
    }
    static chanceToUseFailed(skillClass) {
        return new Log('USE_CHANCE_SKILL_FAILED', `Chance to use the ${skillClass.name} skill has failed`)
    }
    static restriction(skillClass) {
        return new Log('RESTRICTION_SKILL', `A state blocks the use of the ${skillClass.name} skill`)
    }
    static alreadyLearned(skillClass) {
        return new Log('SKILL_ALREADY_LEARNED', `The ${skillClass.name} skill is already learned`)
    }
}