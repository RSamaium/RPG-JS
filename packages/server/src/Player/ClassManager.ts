import { Utils }  from '@rpgjs/common'
import { ParameterManager } from './ParameterManager'
import { ItemManager } from './ItemManager'

const { 
    applyMixins
} = Utils

export class ClassManager {

    _class: any

    setClass(_class) {
        this._class = new _class()
    }

    setActor(actorClass) {
        const actor = new actorClass()
        this.name  = actor.name
        this.initialLevel = actor.initialLevel
        this.finalLevel = actor.finalLevel
        this.expCurve = actor.expCurve
        for (let param in actor.parameters) {
            this.addParameter(param, actor.parameters[param])
        }
        for (let item of actor.startingEquipment) {
            this.addItem(item)
            this.equip(item, true)
        }
        this.setClass(actor.class)
    }
}

applyMixins(ClassManager, [ParameterManager, ItemManager])

export interface ClassManager extends ParameterManager, ItemManager {
    name: string
 }