import { merge } from './common'
import { EfficiencyOptions } from './efficiency'

interface StateOptions extends EfficiencyOptions {
    name: string,
    effects?: [StateEffect]
}

export enum StateEffect {
    NONE = 'none',
    CAN_NOT_SKILL = 'can-not-skill',
    CAN_NOT_ITEM = 'can-not-item',
    ALWAYS_ATTACK_ENEMIES = 'always-attack-enemies',
    CAN_NOT_EVADE = 'can-not-evade',
    CAN_NOT_GET_EXP = 'can-not-get-exp',
    CAN_NOT_GET_GOLD = 'can-not-get-gold'
}

export function State(options: StateOptions) {
    return merge(options, 'state')
}