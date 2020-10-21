import { Actor } from '@rpgjs/database'
import { Presets } from '@rpgjs/server'
import { Fighter } from '../classes/fighter'
import { Sword } from '../weapons/sword'
import { Shield } from '../armors/shield'

const { MAXHP, MAXSP, MAXHP_CURVE, MAXSP_CURVE } = Presets

@Actor({
    name: 'Hero',
    initialLevel: 1,
    finalLevel: 99,
    expCurve: {
        basis: 30,
        extra: 20,
        accelerationA: 30,
        accelerationB: 30
    },
    parameters: {
        [MAXHP]: MAXHP_CURVE,
        [MAXSP]: MAXSP_CURVE
    },
    startingEquipment: [
        Sword,
        Shield
    ],
    class: Fighter 
})
export class Hero {
    
}