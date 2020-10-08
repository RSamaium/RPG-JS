import { merge } from './common'

export interface ArmorOptions {
    name: string,
    description?: string,
    price?: number
}

export function Armor(options: ArmorOptions) {
    return merge(options, 'armor', {
        price: options.price
    })
}