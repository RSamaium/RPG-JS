import { Utils }  from '@rpgjs/common'
import { RpgPlayer } from './Player';
import { ItemFixture } from './ItemFixture';
import { ItemInstance } from '@rpgjs/database';

const { 
    arrayUniq,
    applyMixins
} = Utils

export class ElementManager extends ItemFixture {
    _elementsEfficiency: { rate: number, element: any }[]
    
     /** 
     * Recovers the player's elements defense on inventory.  This list is generated from the `elementsDefense` property defined on the weapons or armors equipped.
     * If several items have the same element, only the highest rate will be taken into account.
     * 
     * ```ts
     * import { Armor } from '@rpgjs/server'
     * 
     * enum Elements {
     *   Fire = 'fire'
     * }
     * 
     * @Armor({
     *      name: 'Shield',
     *      elementsDefense: [{ rate: 1, element: Elements.Fire }]
     * })
     * class Shield {}
     * 
     * @Armor({
     *      name: 'FireShield',
     *      elementsDefense: [{ rate: 0.5, element: Elements.Fire }]
     * })
     * class FireShield {}
     * 
     * player.addItem(Shield)
     * player.addItem(FireShield)
     * player.equip(Shield)
     * player.equip(FireShield)
     * 
     * console.log(player.elementsDefense) // [{ rate: 1, element: 'fire' }]
     * ``` 
     * @title Get Elements Defense
     * @prop {Array<{ rate: number, element: Element}>} player.elementsDefense
     * @readonly
     * @memberof ElementManager
     * */
    get elementsDefense(): { rate: number, element: any }[] {
        return this.getFeature('elementsDefense', 'element')
    }

     /** 
     * Set or retrieves all the elements where the player is vulnerable or not. 
     * 
     * ```ts
     * import { Class } from '@rpgjs/server'
     * 
     * enum Elements {
     *   Fire = 'fire',
     *   Ice = 'ice'
     * }
     * 
     * @Class({
     *      name: 'Fighter',
     *      elementsEfficiency: [{ rate: 1, element: Elements.Fire }]
     * })
     * class Hero {}
     * 
     * player.setClass(Hero)
     * 
     * console.log(player.elementsEfficiency) // [{ rate: 1, element: 'fire' }]
     * 
     * player.elementsEfficiency = [{ rate: 2, element: Elements.Ice }]
     * 
     * console.log(player.elementsEfficiency) // [{ rate: 1, element: 'fire' }, { rate: 2, element: 'ice' }]
     * ``` 
     * @title Set/Get Elements Efficiency
     * @prop {Array<{ rate: number, element: Element}>} player.elementsEfficiency
     * @memberof ElementManager
     * */
    get elementsEfficiency(): { rate: number, element: any }[] {
        if (this._class) {
            return <any>[...this._elementsEfficiency, ...this._class.elementsEfficiency]
        }
        return this._elementsEfficiency
    }

    set elementsEfficiency(val) {
        this._elementsEfficiency = val
    }

    /** 
     * Retrieves a array of elements assigned to the player and the elements of the weapons / armor equipped
     * 
     * ```ts
     * console.log(player.elements)
     * ``` 
     * @title Get Elements
     * @prop {Array<Element>} player.elements
     * @readonly
     * @memberof ElementManager
     * */
    get elements(): {
        rate: number,
        element: string
    }[] {
        let elements: any = []
        for (let item of this.equipments) {
            if (item.elements) {
                elements = [...elements, ...item.elements]
            }
        }
        return arrayUniq(elements)
    }

    coefficientElements(otherPlayer: RpgPlayer): number {
        const atkPlayerElements: any = otherPlayer.elements
        const playerElements: any = this.elementsEfficiency
        let coefficient = 1

        for (let atkElement of atkPlayerElements) {
            const elementPlayer = playerElements.find(el => el.element == atkElement.element)
            const elementPlayerDef = this.elementsDefense.find(el => el.element == atkElement.element)
            if (!elementPlayer) continue
            const fn = this.getFormulas('coefficientElements')
            if (!fn) {
                return coefficient
            }
            coefficient += fn(atkElement, elementPlayer, elementPlayerDef || { rate: 0 })
        }
        return coefficient
    }
}

export interface ElementManager{ 
    equipments: ItemInstance[]
    getFormulas: (name: string) => any, 
    _class: any
}


applyMixins(ElementManager, [ItemFixture])

export interface ElementManager extends ItemFixture { }