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
    id?: string
    /** Put the name of the item */ 
    name: string,
    description?: string
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
     * @typeParam number
     * 
     * */ 
    hpValue?: number,
    /** the success rate of the object. Value between 0 and 1. Even if the use of the item failed, the item will be removed from the player's inventory. */ 
    hitRate?: number,
    /** Indicate if the item can be used. If not, an error will be sent */ 
    consumable?: boolean
}

export function Item(options: ItemOptions) {
    return merge(options, 'item', {
        price: options.price
    })
}