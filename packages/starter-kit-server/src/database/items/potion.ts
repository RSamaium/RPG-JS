import { Item } from '@rpgjs/database'
import { Paralyze } from '../states/paralyze'

@Item({  
    name: 'Potion',
    description: 'Give 100 HP',
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
   async onAdd(player) {
        await player.showText('A potion has been added to your inventory')
   }
}