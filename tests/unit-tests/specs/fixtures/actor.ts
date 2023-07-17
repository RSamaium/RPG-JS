import { Actor } from '@rpgjs/database'
import { Presets } from '@rpgjs/server'
import { Fighter } from './class'

const {MAXHP } = Presets

@Actor({
    id: 'hero',
    name: 'Hero',
    description: 'A great fighter!',
    initialLevel: 1,
    finalLevel: 99,
    expCurve: {
        basis: 30,
        extra: 20,
        accelerationA: 30,
        accelerationB: 30
    },
    parameters: {
        [MAXHP]: {
            start: 700,
            end: 10000
        }
    },
    startingEquipment: [],
    class: Fighter
})
export class Hero {}