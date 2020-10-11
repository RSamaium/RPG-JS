import { State, Effect } from '@rpgjs/database'

@State({
    name: 'Confuse',
    effects: [Effect.CAN_NOT_SKILL]
})
export class Confuse {
    
}