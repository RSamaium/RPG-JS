import { Utils }  from '@rpgjs/common'
import { ItemLog } from '../logs'
import { GoldManager } from './GoldManager'

const { 
    isString, 
    isInstanceOf,
    applyMixins
} = Utils

export class ItemManager {
    
    getItem(itemClass) {
        const index = this._getItemIndex(itemClass)
        return this.items[index]
    }

    _getItemIndex(itemClass) {
        return this.items.findIndex(it => {
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

        player.addItem(Potion, 5)
        ```
     */
    addItem(itemClass: { new(...args: any[]) }, nb = 1): { item: any, nb: number } {
        let itemIndex = this._getItemIndex(itemClass)
        if (itemIndex != -1) {
            this.items[itemIndex].nb += nb
        }
        else {
            const instance = new itemClass()
            if (!instance.$broadcast) instance.$broadcast = ['name', 'description', 'price', 'consumable']
            this.items.push({
                item: instance,
                nb
            })
            itemIndex = this.items.length - 1
        }
        this.paramsChanged.add('items')
        return this.items[itemIndex]
    }

    removeItem(itemClass, nb = 1): { item: any, nb: number } | undefined {
        const itemIndex: number = this._getItemIndex(itemClass)
        if (itemIndex == -1) {
            throw ItemLog.notInInventory(itemClass)
        }
        const currentNb = this.items[itemIndex].nb
        if (currentNb - nb <= 0) {
            this.items.splice(itemIndex, 1)
        }
        else {
            this.items[itemIndex].nb -= nb
        }
        this.paramsChanged.add('items')
        return this.items[itemIndex]
    }

    buyItem(itemClass, nb = 1): { item: any, nb: number } {
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

    sellItem(itemClass, nbToSell = 1): { item: any, nb: number } {
        if (isString(itemClass)) itemClass = this.databaseById(itemClass)
        const inventory = this.getItem(itemClass)
        if (!inventory) {
            throw ItemLog.notInInventory(itemClass)
        }
        const { item, nb } = inventory
        if (nb - nbToSell < 0) {
            throw ItemLog.tooManyToSell(itemClass, nbToSell, nb)
        }
        this.gold += (itemClass.price / 2) * nbToSell
        this.removeItem(itemClass, nbToSell)
        return inventory
    } 

    /*useItem(itemClass) {
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
            if (item.onUseFailed) item.onUseFailed(this)
            throw ItemLog.chanceToUseFailed(itemClass)
        }
        this.applyEffect(item)
        this.applyStates(this, item)
        if (item.onUse) item.onUse(this)
        this.removeItem(itemClass)
        return inventory
    }*/
}

applyMixins(ItemManager, [GoldManager])

export interface ItemManager extends GoldManager {
    databaseById(itemClass: any)
    paramsChanged: Set<string>
    items: any
}