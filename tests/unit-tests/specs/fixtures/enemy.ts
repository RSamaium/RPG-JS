import { Enemy, Efficiency } from '@rpgjs/database'
import { RpgEnemy } from '@rpgjs/server'
import { Sword } from './weapons'
import { Shield } from './armor'
import { Confuse } from './state'
import { Elements } from './elements'

@Enemy({
    name: 'Monster',
    parameters: {
       maxHp: { start: 540, end: 1000},
       str: { start: 41, end: 1000 }
    },
    gain: {
        exp: 10,
        gold: 15
    },
    startingEquipment: [Sword, Shield],
    statesEfficiency: [{
        state: Confuse,
        efficiency: Efficiency.PERFECT_INVULNERABLE
    }],
    elementsEfficiency: [{ 
        element: Elements.Fire,
        efficiency: Efficiency.VERY_VULNERABLE
    }]
})
export class Monster extends RpgEnemy {

}