import { merge } from './common'

interface ItemOptions {
    /** Put the name of the item */ 
    name: string,
    description?: string,
    price?: number,
    hpValue?: number,
    hitRate?: number,
    consumable?: boolean,
    addStates?: any[],
    removeStates?: any[]
}

export function Item(options: ItemOptions) {
    return merge(options, 'item', {
        price: options.price
    })
}