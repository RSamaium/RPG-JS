export type Elements = { rate: number, element: any }[] | any[]

export interface ElementsOption {
    /** 
     * List of elements.
     * 
     * Applies a vulnerability rate. It is a multiplying coefficient for damage calculations.
     * 
     * To help, you can use the Efficiency enumerations
     * 
     * @prop {Array<{ rate: number, element: Element} | Element>} [elements]
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
     * elements: [Element.Fire] // rate is 1 by default
     * ```
     * 
     * Example 2 
     * 
     * ```ts
     * import { Element } from 'my-database/elements'
     * 
     * elements: [{ rate: 1.5, element: Element.Fire }]
     * ```
     * Example 3 
     * 
     * ```ts
     * import { Efficiency } from '@rpgjs/server'
     * import { Element } from 'my-database/elements'
     * 
     * elements: [{ rate: Efficiency.VULNERABLE, element: Element.Fire }]
     * ```
     * @memberof Item
     * @memberof Weapon
     * @memberof Armor
     * @memberof Skill
     * */
    elements?: Elements
}