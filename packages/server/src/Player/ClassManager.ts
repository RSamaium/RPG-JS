import { Utils }  from '@rpgjs/common'
import { ParameterManager } from './ParameterManager'
import { ItemManager } from './ItemManager'

const { 
    applyMixins,
    isString
} = Utils

type ClassClass = { new(...args: any[]) }
type ActorClass = { new(...args: any[]) }

export class ClassManager {

    _class: any

    /** 
     * Assign a class to the player
     * 
     * ```ts
     * import { Fighter } from 'my-database/classes/fighter'
     * 
     * player.setClass(Fighter)
     * ```
     * 
     * @title Set Class
     * @method player.setClass(ClassClass)
     * @param {ClassClass | string} class class or id
     * @returns {instance of ClassClass} 
     * @memberof ClassManager
     * */
    setClass(_class: ClassClass | string) {
        if (isString(_class)) _class = this.databaseById(_class)
        this._class = new (_class as ClassClass)()
        this['execMethod']('onSet', [this], this._class)
        return this._class
    }

    /** 
     * Allows to give a set of already defined properties to the player (default equipment, or a list of skills to learn according to the level)
     * 
     * ```ts
     * import { Hero } from 'my-database/classes/hero'
     * 
     * player.setActor(Hero)
     * ```
     * 
     * @title Set Actor
     * @method player.setActor(ActorClass)
     * @param {ActorClass | string} actorClass actor class or id
     * @returns {instance of ActorClass} 
     * @memberof ClassManager
     * */
    setActor(actorClass: ActorClass | string) {
        if (isString(actorClass)) actorClass = this.databaseById(actorClass)
        const actor = new (actorClass as ActorClass)();
        ['name', 'initialLevel', 'finalLevel', 'expCurve'].forEach(key => {
            if (actor[key]) this[key] = actor[key]
        })
        for (let param in actor.parameters) {
            this.addParameter(param, actor.parameters[param])
        }
        for (let item of actor.startingEquipment) {
            this.addItem(item)
            this.equip(item, true)
        }
        if (actor.class) this.setClass(actor.class)
        this['execMethod']('onSet', [this], actor)
        return actor
    }
}

applyMixins(ClassManager, [ParameterManager, ItemManager])

export interface ClassManager extends ParameterManager, ItemManager {
    name: string
 }