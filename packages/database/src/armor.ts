import { merge } from './common'
import { EquipmentOptions } from './item'

export interface ArmorClass {
    new(...args: any[]): ArmorInstance;
    price?: number;
    _type?: string;
}

export interface ArmorOptions extends EquipmentOptions { }

export interface ArmorInstance extends ArmorOptions {
    equipped?: boolean
}

export function Armor(options: ArmorOptions) {
    return merge(options, 'armor', {
        price: options.price
    })
}