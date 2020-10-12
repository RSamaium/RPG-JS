import { merge } from './common'
import { Effect } from './effect'

export type Elements = { rate: number, element: any }[] | any[]
export type States = { rate: number, state: any }[] | any[]

export interface ItemGlobalOptions {
    /** Put the name of the item */ 
    name: string,
    description?: string
    price?: number
    addStates?: any[]
    removeStates?: any[]
    elements?: Elements,
    effects?: Effect[]
    paramsModifier?: {
        [key: string]: {
            value?: number,
            rate?: number
        }
    }
}

export interface EquipmentOptions extends ItemGlobalOptions {
    pdef?: number,
    sdef?: number,
    params?: object
    statesDefense?: States
    elementsDefense?: Elements
}

interface ItemOptions extends ItemGlobalOptions {
    hpValue?: number,
    hitRate?: number,
    consumable?: boolean
}

export function Item(options: ItemOptions) {
    return merge(options, 'item', {
        price: options.price
    })
}