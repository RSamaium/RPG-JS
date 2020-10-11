import { Armor } from '@rpgjs/database'
import { Elements } from './elements'

@Armor({
    name: 'Shield',
    price: 100,
    pdef: 22,
    sdef: 20,
    elementsDefense: [Elements.Fire]
})
export class Shield {}