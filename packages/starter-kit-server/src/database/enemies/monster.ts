import { Enemy } from '@rpgjs/database'
import { RpgEnemy, Presets } from '@rpgjs/server'
import { Sword } from '../weapons/sword'
import { Shield } from '../armors/shield'

const { MAXHP, STR } = Presets

@Enemy({
    name: 'Monster',
    graphic: 'bird',
    parameters: {
       [MAXHP]: { start: 540, end: 1000},
       [STR]: { start: 41, end: 1000 }
    },
    gain: {
        exp: 10,
        gold: 15
    },
    startingEquipment: [Sword, Shield]
})
export class Monster extends RpgEnemy {

}