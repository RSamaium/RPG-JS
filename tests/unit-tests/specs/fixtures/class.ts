import { Class } from '@rpgjs/database'
import { Elements } from './elements'

@Class({
    name: 'Fighter',
    elementsEfficiency: [Elements.Fire],
    equippable: ['Sword']
})
export class Fighter {
   canEquip(item: any, player: any) {
       return true
   }
}