import { Elements } from "./elements";
import { States } from "./states";

export interface EfficiencyOptions {
    /** 
     * List of states.
     * 
     * Changes the efficiency of the states. It indicates whether or not the player with a class or state will be vulnerable to the state.
     * It is a multiplying coefficient for damage calculations.
     * 
     * To help, you can use the Efficiency enumerations
     * 
     * @prop {Array<{ rate: number, element: StateClass} | StateClass>} [statesEfficiency]
     * @enum {number}
     * @example 
     * 
     * Example 1
     * 
     * ```ts
     * import { Paralyze } from 'my-database/states/paralyze'
     * 
     * statesEfficiency: [Paralyze] // rate is 1 by default
     * ```
     * 
     * Example 2 
     * 
     * ```ts
     * import { Paralyze } from 'my-database/states/paralyze'
     * 
     * statesEfficiency: [{ rate: 1.5, state: Paralyze }]
     * ```
     * Example 3 (todo)
     * 
     * ```ts
     * import { Efficiency } from '@rpgjs/server'
     * import { Paralyze } from 'my-database/states/paralyze'
     * 
     * statesEfficiency: [{ rate: Efficiency.VULNERABLE, state: Paralyze }]
     * ```
     * @memberof State
     * @memberof Class
     * @memberof Enemy
     * @memberof Actor
     * @todo 
     * */
    statesEfficiency?: States
    /** 
     * List of elements.
     * 
     * Changes the efficiency of the elements. It indicates whether or not the player with a class or state will be vulnerable to the element.
     * It is a multiplying coefficient for damage calculations.
     * 
     * To help, you can use the Efficiency enumerations
     * 
     * @prop {Array<{ rate: number, element: Element} | Element>} [elementsEfficiency]
     * @enum {number}
     * 
     * Efficiency.GAIN_HP | -0.5 value
     * Efficiency.PERFECT_INVULNERABLE | 0 value
     * Efficiency.INVULNERABLE | 0.5 value
     * Efficiency.NORMAL | 1 value
     * Efficiency.VULNERABLE | 1.5 value
     * Efficiency.VERY_VULNERABLE | 2 value
     * @example 
     * 
     * Example 1
     * 
     * ```ts
     * import { Element } from 'my-database/elements'
     * 
     * elementsEfficiency: [Element.Fire] // rate is 1 by default
     * ```
     * 
     * Example 2 
     * 
     * ```ts
     * import { Element } from 'my-database/elements'
     * 
     * elementsEfficiency: [{ rate: 1.5, element: Element.Fire }]
     * ```
     * Example 3 
     * 
     * ```ts
     * import { Efficiency } from '@rpgjs/server'
     * import { Element } from 'my-database/elements'
     * 
     * elementsEfficiency: [{ rate: Efficiency.VULNERABLE, element: Element.Fire }]
     * ```
     * @memberof State
     * @memberof Class
     * @memberof Enemy
     * @memberof Actor
     * */
    elementsEfficiency?: Elements
}

export enum Efficiency {
    VERY_VULNERABLE = 2,
    VULNERABLE = 1.5,
    NORMAL = 1,
    INVULNERABLE = 0.5,
    PERFECT_INVULNERABLE = 0,
    GAIN_HP = -0.5
}