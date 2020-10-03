import { Weapon } from '@rpgjs/database'

@Weapon({
    name: 'Sword',
    description: 'Figther Weapon',
    price: 500,
    param: {
        atk: 138
    }
})
export class Sword {
   
}