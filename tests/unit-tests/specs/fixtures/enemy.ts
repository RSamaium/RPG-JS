import { Enemy } from '@rpgjs/database'
import { RpgEnemy } from '@rpgjs/server'
import { Sword } from './weapons'
import { Shield } from './armor'

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
    equipments: [Sword, Shield]
})
export class Monster extends RpgEnemy {

}