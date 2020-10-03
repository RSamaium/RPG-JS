import { Actor } from '@rpgjs/database'
import { Presets } from '@rpgjs/server'
import { Fighter } from '../classes/fighter'

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

    ],
    class: Fighter 
})
export class Hero {
    
}