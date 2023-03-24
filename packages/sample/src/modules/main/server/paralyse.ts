import { RpgPlayer } from '@rpgjs/server'
import { State } from '@rpgjs/database'

@State({  
    name: 'Paralyse',
    description: 'The player is paralyzed',
    effects: [],
    statesEfficiency: [],
    elementsEfficiency: []
})
export class Paralyse {
    
}