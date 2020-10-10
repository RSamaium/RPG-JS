import { Skill } from '@rpgjs/database'
import { Confuse } from './state'

@Skill({
    name: 'Fire',
    spCost: 75,
    power: 140,
    addStates: [Confuse]
})
export class Fire {}