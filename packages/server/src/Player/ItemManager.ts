import { Utils }  from '@rpgjs/common'
import { Effect } from '@rpgjs/database'
import { ItemLog } from '../logs'
import { ItemModel } from '../models/Item'
import { EffectManager } from './EffectManager'
import { GoldManager } from './GoldManager'
import { StateManager } from './StateManager'

import { 
    ATK,
    PDEF,
    SDEF
} from '../presets'

const { 
    isString, 
    isInstanceOf,
    applyMixins
} = Utils

type ItemClass = { new(...args: any[]), price?: number, }
type Inventory =  { nb: number, item: ItemModel }

export class ItemManager {

    items: Inventory[]
    equipments: any[] = []
    
    getItem(itemClass: ItemClass) {
        const index: number = this._getItemIndex(itemClass)
        return this.items[index]
    }

    _getItemIndex(itemClass: ItemClass | string): number {
        return this.items.findIndex((it: Inventory): boolean => {
            if (isString(itemClass)) {
                return it.item.id == itemClass
            }
            return isInstanceOf(it.item, itemClass)
        })
    }
    /**
     * Add an object in the player's inventory. You can give more than one by specifying `nb`
     * @param itemClass 
     * @param nb 
     * 
     * @example
     * 
     * ```ts
     *  import Potion from 'your-database/potion'
import { StateManager } from './StateManager';
import { ItemModel } from '../models/Item';

        player.addItem(Potion, 5)
        ```
     */
    addItem(itemClass: ItemClass, nb: number = 1): Inventory {
        let itemIndex: number = this._getItemIndex(itemClass)
        if (itemIndex != -1) {
            this.items[itemIndex].nb += nb
        }
        else {
            const instance = new itemClass()
            this.items.push({
                item: instance,
                nb
            })
            itemIndex = this.items.length - 1
        }
        return this.items[itemIndex]
    }

    removeItem(itemClass: ItemClass, nb = 1): Inventory | undefined {
        const itemIndex: number = this._getItemIndex(itemClass)
        if (itemIndex == -1) {
            throw ItemLog.notInInventory(itemClass)
        }
        const currentNb: number = this.items[itemIndex].nb
        if (currentNb - nb <= 0) {
            this.items.splice(itemIndex, 1)
        }
        else {
            this.items[itemIndex].nb -= nb
        }
        return this.items[itemIndex]
    }

    buyItem(itemClass: ItemClass, nb = 1): Inventory {
        if (isString(itemClass)) itemClass = this.databaseById(itemClass)
        if (!itemClass.price) {
            throw ItemLog.haveNotPrice(itemClass)
        }
        const totalPrice = nb * itemClass.price
        if (this.gold < totalPrice) {
            throw ItemLog.notEnoughGold(itemClass, nb)
        }
        this.gold -= totalPrice
        return this.addItem(itemClass, nb)
    }

    sellItem(itemClass: ItemClass, nbToSell = 1): Inventory {
        if (isString(itemClass)) itemClass = this.databaseById(itemClass)
        const inventory = this.getItem(itemClass)
        if (!inventory) {
            throw ItemLog.notInInventory(itemClass)
        }
        const { item, nb } = inventory
        if (nb - nbToSell < 0) {
            throw ItemLog.tooManyToSell(itemClass, nbToSell, nb)
        }
        if (!itemClass.price) {
            throw ItemLog.haveNotPrice(itemClass)
        }
        this.gold += (itemClass.price / 2) * nbToSell
        this.removeItem(itemClass, nbToSell)
        return inventory
    } 

    private getParamItem(name) {
        let nb = 0
        for (let item of this.equipments) {
            nb += item[name] || 0
        }
        const modifier = this.paramsModifier[name]
        if (modifier) {
            if (modifier.value) nb += modifier.value
            if (modifier.rate) nb *= modifier.rate
        }
        return nb
    }

    get atk(): number {
        return this.getParamItem(ATK)
    }

    get pdef(): number {
        return this.getParamItem(PDEF)
    }

    get sdef(): number {
        return this.getParamItem(SDEF)
    }

    useItem(itemClass: ItemClass) {
        const inventory = this.getItem(itemClass)
        if (this.hasEffect(Effect.CAN_NOT_ITEM)) {
            throw ItemLog.restriction(itemClass)
        }
        if (!inventory) {
            throw ItemLog.notInInventory(itemClass)
        }
        const { item } = inventory
        if (item.consumable === false) {
            throw ItemLog.notUseItem(itemClass)
        }
        const hitRate = item.hitRate || 1
        if (Math.random() > hitRate) {
            this.removeItem(itemClass)
            if (item.onUseFailed) item.onUseFailed(<any>this)
            throw ItemLog.chanceToUseFailed(itemClass)
        }
        this.applyEffect(item)
        this.applyStates(<any>this, <any>item)
        if (item.onUse) item.onUse(<any>this)
        this.removeItem(itemClass)
        return inventory
    }

    equip(itemClass, bool = true) {
        const inventory = this.getItem(itemClass)
        if (!inventory) {
            return ItemLog.notInInventory(itemClass)
        }
        if (itemClass._type == 'item') {
            return ItemLog.invalidToEquiped(itemClass)
        }
        const { item } = inventory
        if (item.equipped && bool) {
            return ItemLog.isAlreadyEquiped(itemClass)
        }
        item.equipped = bool
        if (!bool) {
            const index = this.equipments.findIndex(it => it.id == item.id)
            this.equipments.splice(index, 1)
        }
        else {
            this.equipments.push(item)
        }
    }
}

applyMixins(ItemManager, [GoldManager, StateManager, EffectManager])

export interface ItemManager extends GoldManager, StateManager, EffectManager {
    databaseById(itemClass: any)
}