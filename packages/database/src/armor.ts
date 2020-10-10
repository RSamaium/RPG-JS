import { merge } from './common'

export interface ArmorOptions {
    name: string,
    description?: string,
    price?: number,
    pdef?: number,
    sdef?: number,
    params?: object
}

export function Armor(options: ArmorOptions) {
    return merge(options, 'armor', {
        price: options.price
    })
}