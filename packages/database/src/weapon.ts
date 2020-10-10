import { merge } from './common'
import { EquipmentOptions } from './item'

export interface WeaponOptions extends EquipmentOptions {
    atk?: number
}

export function Weapon(options: WeaponOptions) {
    return merge(options, 'weapon', {
        price: options.price
    })
}