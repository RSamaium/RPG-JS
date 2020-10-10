import { State, StateEffect } from '@rpgjs/database'

@State({
    name: 'Confuse',
    effects: [StateEffect.CAN_NOT_SKILL]
})
export class Confuse {
    
}