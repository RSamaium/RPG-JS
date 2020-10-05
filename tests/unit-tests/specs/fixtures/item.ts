import { Item } from '@rpgjs/database'

@Item({
    name: 'Potion',
    price: 100
})
export class Potion {}

@Item({
    name: 'Key',
    consumable: false
})
export class Key {}