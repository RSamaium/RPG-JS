import { Armor } from '@rpgjs/database'
import { Presets } from '@rpgjs/server'
import { Elements } from './elements'

const { MAXHP } = Presets

@Armor({
    name: 'Shield',
    price: 100,
    pdef: 22,
    sdef: 20,
    elementsDefense: [Elements.Fire]
})
export class Shield {}

@Armor({
    name: 'HpUpValue',
    paramsModifier: {
        [MAXHP]: {
            value: 100
        }
    }
})
export class HpUpValue {}