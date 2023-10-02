import { Skill } from '@rpgjs/database'
import { Confuse } from './state'

@Skill({
    id: 'fire',
    name: 'Fire',
    spCost: 75,
    power: 140,
    addStates: [Confuse]
})
export class Fire {}

@Skill({
    id: 'ice',
    name: 'Ice',
    spCost: 60,
    power: 130,
})
export class Ice {}