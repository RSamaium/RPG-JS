import { State, Effect } from '@rpgjs/database'
import { Presets } from '@rpgjs/server'

const { MAXHP } = Presets

@State({
    name: 'Confuse',
    effects: [Effect.CAN_NOT_SKILL]
})
export class Confuse {
    
}

@State({
    name: 'Sleep'
})
export class Sleep {
    
}

@State({
    name: 'HP Plus',
    paramsModifier: {
        [MAXHP]: {
            value: 100
        }
    }
})
export class HpPlus {
    
}