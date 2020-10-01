import { Item } from 'rpgjs/database'
import { Query } from 'rpgjs/server'
import { Paralyze } from '../states/paralyze'

@Item({
    name: 'Potion',
    description: 'Donne 5 PV',
    price: 200,
    parameter: {
        type: 'int',
        inc: 5
    },
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