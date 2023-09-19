import { merge, Data } from './common'
import { ElementsOption, Elements } from './interfaces/elements';
import { ParamsModifierOption } from './interfaces/params-modifier'
import { StatesOption, States } from './interfaces/states';

export interface ItemClass {
    new(...args: any[]): ItemInstance;
    price?: number;
    _type?: string;
}

export interface ItemGlobalOptions extends ParamsModifierOption, Data, ElementsOption, StatesOption {
     /** 
     * The price of the item. If the price is undefined, then it will not be possible to buy or sell the item.
     * @prop {number} [price]
     * @memberof Item
     * @memberof Weapon
     * @memberof Armor
     * */
    price?: number
}

export interface EquipmentOptions extends ItemGlobalOptions {
    pdef?: number,
    sdef?: number,
    params?: object
    statesDefense?: States
    elementsDefense?: Elements
}

export interface ItemOptions extends ItemGlobalOptions {
    /** 
     * The number of heart points given back by the item 
     * @prop {number} [hpValue]
     * @memberof Item
     * */ 
    hpValue?: number,
    /** The success rate of the item. Value between 0 and 1. Even if the use of the item failed, the item will be removed from the player's inventory. 
     * @prop {number} [hitRate]
     * @default 1
     * @memberof Item
     * */ 
    hitRate?: number,
    /** 
     * Indicate if the item can be used. If not, an error will be sent 
     * @prop {boolean} [consumable]
     * @default true
     * @memberof Item
     * */ 
    consumable?: boolean
}

export interface ItemInstance extends ItemOptions {}

export function Item(options: ItemOptions) {
    return merge(options, 'item', {
        price: options.price
    })
}