import { merge } from './common'
import { EquipmentOptions } from './item'

export interface ArmorOptions extends EquipmentOptions { }

export function Armor(options: ArmorOptions) {
    return merge(options, 'armor', {
        price: options.price
    })
}