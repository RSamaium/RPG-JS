import { Item } from '@rpgjs/database'

@Item({
    id: 'potion',
    name: 'Potion',
    description: 'Gives 100 HP',
    price: 200,
    hpValue: 100,
    hitRate: 1,
    consumable: true,
    addStates: [],
    removeStates: [],
    elements: [],
    paramsModifier: {}
})
export default class Potion {}