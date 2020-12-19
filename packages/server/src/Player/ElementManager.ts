import { Utils }  from '@rpgjs/common'
import { RpgPlayer } from './Player';
import { ItemModel } from '../models/Item';

const { 
    isInstanceOf,
    arrayUniq
} = Utils

export class ElementManager {

    private _statesEfficiency: { rate: number, state: any }[] = []
    private _elementsEfficiency: { rate: number, element: any }[] = []
    
    get elementsDefense(): { rate: number, element: any }[] {
        return this.getFeature('elementsDefense', 'element')
    }

    get statesDefense(): { rate: number, state: any }[] {
        return this.getFeature('statesDefense', 'state')
    }

    get statesEfficiency() {
        return this._statesEfficiency
    }

    set statesEfficiency(val) {
        this._statesEfficiency = val
    }

    get elementsEfficiency(): { rate: number, element: any }[] {
        if (this._class) {
            return <any>[...this._elementsEfficiency, ...this._class.elementsEfficiency]
        }
        return this._elementsEfficiency
    }

    set elementsEfficiency(val) {
        this._elementsEfficiency = val
    }

    get elements() {
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

    private getFeature(name, prop): any {
        const array = {}
        for (let item of this.equipments) {
            if (item[name]) {
                for (let feature of item[name]) {
                    const { rate } = feature
                    const instance = feature[prop]
                    const cache = array[instance.id]
                    if (cache && cache.rate >= rate) continue
                    array[instance.id] = feature
                }
            }
        }
        return Object.values(array)
    }

    private findStateEfficiency(stateClass) {
        return this.statesEfficiency.find(state => isInstanceOf(state.state, stateClass))
    }
}

export interface ElementManager{ 
    equipments: ItemModel[]
    getFormulas: (name: string) => any, 
    _class: any
}
