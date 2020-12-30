import { Item } from '@rpgjs/database'

@Item({  
    name: 'Potion',
    description: 'Give 100 HP',
    price: 200,
    hpValue: 100,
    hitRate: 1,
    consumable: true
})
export class Potion { }