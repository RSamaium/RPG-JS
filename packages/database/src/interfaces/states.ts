export type States = { rate: number, state: any }[] | any[]

export interface StatesOption {
    /** 
     * Apply states
     * - If it is an item, the state will be applied during the `useItem()` method
     * 
     * The array can contain a rate of chance (between 0 and 1) that the state applies.
     * 
     * Example, the Paralize state has a 1 in 2 chance of applying :
     * ```ts
     * // Paralize is a class with the decorator State
     * addStates: [{ rate: 0.5, state: Paralize }]
     * ``` 
     * 
     * @prop {Array<{ rate: number, state: StateClass } | StateClass>} [addStates]
     * @memberof Item
     * @memberof Weapon
     * @memberof Armor
     * */
    addStates?: States
    /** 
     * Remove states. If the player has states, the object will remove them.
     * 
     * The array can contain a rate of chance (between 0 and 1) of state removal
     * 
     * Example, the Paralize state has a 1 in 2 chance of removal :
     * ```ts
     * // Paralize is a class with the decorator State
     * removeStates: [{ rate: 0.5, state: Paralize }]
     * ``` 
     * 
     * @prop {Array<{ rate: number, state: StateClass } | StateClass>} [removeStates]
     * @memberof Item
     * @memberof Weapon
     * @memberof Armor
     * @memberof Skill
     * */
    removeStates?: States
}