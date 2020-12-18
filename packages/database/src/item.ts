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
     * @memberof Weapon
     * @memberof Armor
     * */ 
    id?: string
     /** 
     * The name of the item. 
     * @prop {string} name
     * @memberof Item
     * @memberof Weapon
     * @memberof Armor
     * */ 
    name: string,
     /** 
     * The description of the item. 
     * @prop {string} [description]
     * @memberof Item
     * @memberof Weapon
     * @memberof Armor
     * */ 
    description?: string
     /** 
     * The price of the item. If the price is undefined, then it will not be possible to buy or sell the item.
     * @prop {number} [price]
     * @memberof Item
     * @memberof Weapon
     * @memberof Armor
     * */
    price?: number
     /** 
     * Apply states
     * - If it is an item, the state will be applied during the `useItem()` method
     * 
     * The array can contain a rate of chance (between 0 and 1) that the state applies.
     * 
     * Example, the Paralize state has a 1 in 2 chance of applying :
     * ```ts
     * // Paralize is a class with the decorator State
     * addStates: [{ rate: 0.5, state: Paralize }]
     * ``` 
     * 
     * @prop {Array<{ rate: number, state: StateClass } | StateClass>}} [addStates]
     * @memberof Item
     * @memberof Weapon
     * @memberof Armor
     * */
    addStates?: States
    /** 
     * Remove states. If the player has states, the object will remove them.
     * 
     * The array can contain a rate of chance (between 0 and 1) of state removal
     * 
     * Example, the Paralize state has a 1 in 2 chance of removal :
     * ```ts
     * // Paralize is a class with the decorator State
     * removeStates: [{ rate: 0.5, state: Paralize }]
     * ``` 
     * 
     * @prop {Array<{ rate: number, state: StateClass } | StateClass>}} [removeStates]
     * @memberof Item
     * @memberof Weapon
     * @memberof Armor
     * */
    removeStates?: States
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