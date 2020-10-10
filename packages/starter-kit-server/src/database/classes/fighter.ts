import { Class } from '@rpgjs/database'
import { Fire } from '../skills/fire'

@Class({
    name: 'Fighter',
    equippable: [

    ],
    stateEfficiency: [

    ],
    elementEfficency: [

    ],
    skillsToLearn: [
        { level: 1, skill: Fire }
    ]
})
export class Fighter {
   
}