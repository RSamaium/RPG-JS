import { Log } from './log'

export class ItemLog {
    static notInInventory(itemClass) {
        return new Log('ITEM_NOT_INVENTORY', `The item ${itemClass.name} is not in inventory`)
    }
    static notUseItem(itemClass) {
        return new Log('NOT_USE_ITEM', `The player cannot use the ${itemClass.name} item.`)
    }
    static chanceToUseFailed(itemClass) {
        return new Log('USE_CHANCE_ITEM_FAILED', `Chance to use the ${itemClass.name} item has failed`)
    }
    static invalidToEquiped(itemClass) {
        return new Log('INVALID_ITEM_TO_EQUIP', `The item ${itemClass.name} is not a weapon or armor`)
    }
    static canNotEquip(itemClass) {
        return new Log('CANNOT_EQUIP', `The item ${itemClass.name} cannot be equiped`)
    }
    static isAlreadyEquiped(itemClass) {
        return new Log('ITEM_ALREADY_EQUIPED', `The item ${itemClass.name} is already equiped`)
    }
    static haveNotPrice(itemClass) {
        return new Log('NOT_PRICE', `Define a price > 0 to buy ${itemClass.name}`)
    }
    static notEnoughGold(itemClass, nb) {
        return new Log('NOT_ENOUGH_GOLD', `not enough gold to buy ${nb} ${itemClass.name}`)
    }
    static tooManyToSell(itemClass, nbToSell, nb) {
        return new Log('TOO_MANY_ITEM_TO_SELL', `Too many items to sell: ${nbToSell} ${itemClass.name}, only ${nb} in inventory`)
    }
    static restriction(itemClass) {
        return new Log('RESTRICTION_ITEM', `A state blocks the use of the ${itemClass.name} skill`)
    }
}