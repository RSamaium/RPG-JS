import { merge, Data } from './common'
import { EfficiencyOptions } from './interfaces/efficiency'

export interface ActorGlobalOptions extends EfficiencyOptions, Data {
    /** 
     * Give parameters. Give a start value and an end value. 
     * The start value will be set to the level set at `initialLevel` and the end value will be linked to the level set at `finalLevel`.
     * 
     * ```ts
     * import { Presets } from '@rpgjs/server'
     * 
     * const { MAXHP } = Presets 
     * 
     * parameters: {
     *      [MAXHP]: {
     *          start: 700,
     *          end: 10000
     *      }
     * }
     * ```
     * 
     * @prop {object} [parameters]
     * @param {object} 
     * @memberof Actor
     * @memberof Enemy
     * */
    parameters?: {
        [key: string]: {
            start: number, 
            end: number
        }
    },
   
    /** 
     * Allows to give a default equipment
     * 
     * ```ts
     * import { Sword } from 'my-database/weapons/sword'
     * 
     * startingEquipment: [Sword]
     * ```
     * 
     * @prop {Array<WeaponClass | ArmorClass>} [startingEquipment]
     * @memberof Actor
     * @memberof Enemy
     * */
    startingEquipment?: any[]

     /** 
     * Assigns a default class
     * 
     * ```ts
     * import { Fighter } from 'my-database/classes/fighter'
     * 
     * class: Fighter
     * ```
     * @prop {ClassClass} [class]
     * @memberof Actor
     * @memberof Enemy
     * */
    class?: any
}

export interface ActorOptions extends ActorGlobalOptions {
     /** 
     * @title Set initial level
     * @prop {number} [initialLevel]
     * @memberof Actor
     * */
    initialLevel?: number,

    /** 
     * @title Set final level
     * @prop {number} [finalLevel]
     * @memberof Actor
     * */
    finalLevel?: number,

    /** 
     * With Object-based syntax, you can use following options:
     * - `basis: number`
     * - `extra: number`
     * - `accelerationA: number`
     * - `accelerationB: number`
     * @title Experience Curve
     * @prop {object} [expCurve]
     * @memberof Actor
     * */
    expCurve?: {
        basis: number,
        extra: number,
        accelerationA: number,
        accelerationB: number
    }
}

export function Actor(options: ActorOptions) {
    return merge(options, 'actor')
}