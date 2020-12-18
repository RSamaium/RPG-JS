export type ParamsModifier = {
    [key: string]: {
        value?: number,
        rate?: number
    }
}

export interface ParamsModifierOption {
    /** 
     * Changes the values of some parameters
     * 
     * > It is important that these parameters have been created beforehand with the `addParameter()` method.
     * > By default, the following settings have been created: 
     * - maxhp
     * - maxsp
     * - str
     * - int
     * - dex
     * - agi
     * 
     * **Object Key**
     * 
     * The key of the object is the name of the parameter
     * 
     * > The good practice is to retrieve the name coming from a constant
     * 
     * **Object Value**
     * 
     * The value of the key is an object containing: 
     * ``` 
     * {
     *   value: number,
     *   rate: number
     * }
     * ```
     * 
     * - value: Adds a number to the parameter
     * - rate: Adds a rate to the parameter
     * 
     * > Note that you can put both (value and rate)
     * 
     * In the case of a state or the equipment of a weapon or armor, the parameters will be changed but if the state disappears or the armor/weapon is de-equipped, then the parameters will return to the initial state.
     * 
     * @prop {Object} [paramsModifier]
     * @example
     * 
     * ```ts
     * import { Presets } from '@rpgjs/server'
     * 
     * const { MAXHP } = Presets
     * 
     * paramsModifier: {
     *      [MAXHP]: {
     *          value: 100
     *      }
     * }
     * ```
     * 
     * 1. Player has 741 MaxHp
     * 2. After changing the parameter, he will have 841 MaxHp
     * 
     * @memberof Item
     * @memberof Weapon
     * @memberof Armor
     * @memberof State
     * */
    paramsModifier?: ParamsModifier
}