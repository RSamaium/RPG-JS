import { State, StateRestriction } from '@rpgjs/database'

@State({
    name: 'Confuse',
    restriction: StateRestriction.CAN_NOT_SKILL
})
export class Confuse {}