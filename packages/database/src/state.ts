import { merge } from './common'

interface StateOptions {
    name: string,
    restriction?: StateRestriction
}

export enum StateRestriction {
    NONE = 'none',
    CAN_NOT_SKILL = 'can-not-skill',
    ALWAYS_ATTACK_ENEMIES = 'always-attack-enemies'
}

export function State(options: StateOptions) {
    return merge(options, 'state')
}