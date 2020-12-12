import { Utils }  from '@rpgjs/common'
import { Effect } from '@rpgjs/database'
import { SkillLog } from '../logs'
import { StateManager } from './StateManager'
import { EffectManager } from './EffectManager'
import { ParameterManager } from './ParameterManager';
import { RpgPlayer } from './Player';

import { 
    INT
} from '../presets'

const { 
    isArray, 
    isString, 
    isInstanceOf,
    applyMixins
} = Utils

export class SkillManager {

    skills: any[]

    private _getSkillIndex(skillClass) {
        return this.skills.findIndex(skill => {
            if (isString(skill)) {
                return skill.id == skillClass
            }
            return isInstanceOf(skill, skillClass)
        })
    }

    getSkill(skillClass) {
        const index = this._getSkillIndex(skillClass)
        return this.skills[index]
    }

    learnSkill(skillClass) {
        const instance = new skillClass()
        if (!instance.coefficient) instance.coefficient = {
            [INT]: 1
        }
        this.skills.push(instance)
        return instance
    }

    forgetSkill(skillClass) {
        const index = this._getSkillIndex(skillClass)
        if (index == -1) {
            throw SkillLog.notLearned(skillClass)
        }
        this.skills.splice(index, 1)
    }

    useSkill(skillClass, otherPlayer?: RpgPlayer | RpgPlayer[]) {
        const skill = this.getSkill(skillClass)
        if (this.hasEffect(Effect.CAN_NOT_SKILL)) {
            throw SkillLog.restriction(skillClass)
        }
        if (!skill) {
            throw SkillLog.notLearned(skillClass)
        }
        if (skill.spCost > this.sp) {
            throw SkillLog.notEnoughSp(skillClass, skill.spCost, this.sp)
        }
        this.sp -= (skill.spCost / (this.hasEffect(Effect.HALF_SP_COST) ? 2 : 1))
        const hitRate = skill.hitRate || 1
        if (Math.random() > hitRate) {
            if (skill.onUseFailed) skill.onUseFailed(this, otherPlayer)
            throw SkillLog.chanceToUseFailed(skillClass)
        }
        if (otherPlayer) {
            let players: any = otherPlayer
            if (!isArray(players)) {
                players = [otherPlayer]
            }
            for (let player of players) {
                this.applyStates(player, skill)
                player.applyDamage(this, skill)
            } 
        }
        if (skill.onUse) skill.onUse(this, otherPlayer)
        return skill
    }
}

applyMixins(SkillManager, [ParameterManager, StateManager, EffectManager])

export interface SkillManager extends ParameterManager, StateManager, EffectManager { }