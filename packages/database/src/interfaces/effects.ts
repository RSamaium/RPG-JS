import { Effect } from "../effect";

export interface EffectsOption {
     /** 
     * List of effects applied by the object, weapon, armor or condition
     * @prop {Array<Effect>} [effects]
     * @example 
     * 
     * ```ts
     * import { Effect } from '@rpgjs/server'
     * 
     * effects: [Effect.CAN_NOT_SKILL]
     * ```
     * @memberof Item
     * @memberof Weapon
     * @memberof Armor
     * @memberof State
     * */
    effects?: Effect[]
}