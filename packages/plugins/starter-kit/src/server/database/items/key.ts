import { Item } from '@rpgjs/database'

@Item({  
    name: 'Dungeon Key',
    description: 'it\'s the key to the dungeon',
    price: 1000,
    consumable: false
})
export class Key { }