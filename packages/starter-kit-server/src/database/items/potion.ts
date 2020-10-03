import { Item } from '@rpgjs/database'
import { Paralyze } from '../states/paralyze'

@Item({  
    name: 'Potion',
    description: 'Donne 5 PV',
    price: 200,
    hpValue: 100,
    hitRate: 100,
    consumable: true,
    addStates: [
        
    ],
    removeStates: [
        Paralyze
    ]
})
export class Potion {
   
}