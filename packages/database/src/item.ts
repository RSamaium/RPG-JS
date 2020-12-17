import { merge } from './common'
import { Effect } from './effect'

export type Elements = { rate: number, element: any }[] | any[]
export type States = { rate: number, state: any }[] | any[]
export type ParamsModifier = {
    [key: string]: {
        value?: number,
        rate?: number
    }
}

export interface ItemGlobalOptions {
    /** 
     * The id of the item. The identifier makes it possible to find an object in the database. By default, the identifier is the name of the class
     * @prop {string} [id]
     * @memberof Item
     * */ 
    id?: string
     /** 
     * The name of the item. 
     * @prop {string} name
     * @memberof Item
     * */ 
    name: string,
     /** 
     * The description of the item. 
     * @prop {string} [description]
     * @memberof Item
     * */ 
    description?: string
     /** 
     * The price of the item. If the price is undefined, then it will not be possible to buy or sell the item.
     * @prop {number} [price]
     * @memberof Item
     * */
    price?: number
    addStates?: any[]
    removeStates?: any[]
    elements?: Elements,
    effects?: Effect[]
    paramsModifier?: ParamsModifier
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

export function Item(options: ItemOptions) {
    return merge(options, 'item', {
        price: options.price
    })
}