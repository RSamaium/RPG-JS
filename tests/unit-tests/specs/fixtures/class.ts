import { Class } from '@rpgjs/database'
import { Elements } from './elements'

@Class({
    name: 'Fighter',
    elementsEfficiency: [Elements.Fire]
})
export class Fighter  {}