import { Elements, States } from './item'

export interface EfficiencyOptions {
    statesEfficiency?: Elements
    elementsEfficiency?: States
}

export enum Efficiency {
    VERY_VULNERABLE = 2,
    VULNERABLE = 1.5,
    NORMAL = 1,
    INVULNERABLE = 0.5,
    PERFECT_INVULNERABLE = 0,
    GAIN_HP = -0.5
}