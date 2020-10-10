import { merge } from './common'

export interface WeaponOptions {
    name: string,
    description?: string,
    price?: number,
    atk?: number,
    pdef?: number,
    sdef?: number,
    params?: object
}

export function Weapon(options: WeaponOptions) {
    return merge(options, 'weapon', {
        price: options.price
    })
}