import { Utils }  from '@rpgjs/common'
import { ItemFixture } from './ItemFixture'
import { RpgPlayer } from './Player'
import { StateLog } from '../logs/state'

const { 
    isInstanceOf,
    applyMixins,
    isString
} = Utils

type StateClass = { new(...args: any[]) }

export class StateManager {

    states: any[] = []

    _statesEfficiency: { rate: number, state: any }[]

    /** 
     * Recovers the player's states defense on inventory.  This list is generated from the `statesDefense` property defined on the weapons or armors equipped.
     * If several items have the same element, only the highest rate will be taken into account.
     * 
     * ```ts
     * import { Armor, State } from '@rpgjs/server'
     * 
     * @State({
     *      name: 'Paralyze'
     * })
     * class Paralyze {}
     * 
     * @Armor({
     *      name: 'Shield',
     *      statesDefense: [{ rate: 1, state: Paralyze }]
     * })
     * class Shield {}
     * 
     * @Armor({
     *      name: 'FireShield',
     *      statesDefense: [{ rate: 0.5, state: Paralyze }]
     * })
     * class FireShield {}
     *
     * player.addItem(Shield)
     * player.addItem(FireShield)
     * player.equip(Shield)
     * player.equip(FireShield)
     * 
     * console.log(player.statesDefense) // [{ rate: 1, state: instance of Paralyze }]
     * ``` 
     * @title Get States Defense
     * @prop {Array<{ rate: number, state: StateClass}>} player.statesDefense
     * @readonly
     * @memberof StateManager
     * */
    get statesDefense(): { rate: number, state: any }[] {
        return this.getFeature('statesDefense', 'state')
    }

    /** 
     * Set or retrieves all the states where the player is vulnerable or not. 
     * 
     * ```ts
     * import { Class, State } from '@rpgjs/server'
     * 
     * @State({
     *      name: 'Paralyze'
     * })
     * class Paralyze {}
     * 
     * @State({
     *      name: 'Sleep'
     * })
     * class Sleep {}
     * 
     * @Class({
     *      name: 'Fighter',
     *      statesEfficiency: [{ rate: 1, state: Paralyze }]
     * })
     * class Hero {}
     * 
     * player.setClass(Hero)
     * 
     * console.log(player.statesEfficiency) // [{ rate: 1, instance of Paralyze }]
     * 
     * player.statesEfficiency = [{ rate: 2, state: Sleep }]
     * 
     * console.log(player.statesEfficiency) // [{ rate: 1, state: instance of Paralyze }, { rate: 2, state: instance of Sleep }]
     * ``` 
     * @title Set/Get States Efficiency
     * @prop {Array<{ rate: number, state: StateClass}>} player.statesEfficiency
     * @memberof StateManager
     * */
    get statesEfficiency() {
        return this._statesEfficiency
    }

    set statesEfficiency(val) {
        this._statesEfficiency = val
    }

    applyStates(player: RpgPlayer, { addStates, removeStates }) {
        if (addStates) {
            for (let { state, rate } of addStates) {
                player.addState(state, rate)
            }
        }
        if (removeStates) {
            for (let { state, rate } of removeStates) {
                player.removeState(state, rate)
            }
        } 
    }

    /**
     * Get a state to the player. Returns `null` if the state is not present on the player
     * ```ts
     * import Paralyze from 'your-database/states/paralyze'
     * 
     * player.getState(Paralyze)
     *  ```
     * 
     * @title Get State
     * @method player.getState(stateClass)
     * @param {StateClass | string} stateClass or state id
     * @returns {instance of StateClass | null}
     * @memberof StateManager
     */
    getState(stateClass: StateClass | string) {
        if (isString(stateClass)) stateClass = this.databaseById(stateClass)
        return this.states.find((state) => {
            if (isString(stateClass)) {
                return state.id == stateClass
            }
            return isInstanceOf(state, stateClass)
        })
    }

    /**
     * Adds a state to the player. Set the chance between 0 and 1 that the state can apply
     * ```ts
     * import Paralyze from 'your-database/states/paralyze'
     * 
     * try { 
     *      player.addState(Paralyze)
     * }
     * catch (err) {
     *      console.log(err)
     * }
     *  ```
     * 
     * @title Add State
     * @method player.addState(stateClass,chance=1)
     * @param {StateClass | string} stateClass state class or state id
     * @param {number} [chance] 1 by default
     * @throws {StateLog} addFailed 
     * If the chance to add the state has failed (defined with the `chance` param)
     *  ```
     * {
     *      id: ADD_STATE_FAILED,
     *      msg: '...'
     * }
     * ```
     * @returns {instance of StateClass}
     * @memberof StateManager
     * @todo
     */
    addState(stateClass: StateClass | string, chance = 1): object | null {
        const state = this.getState(stateClass)
        if (isString(stateClass)) {
            stateClass = this.databaseById(stateClass)
        }
        if (!state) {
            if (Math.random() > chance) {
                throw StateLog.addFailed(stateClass)
            }
            //const efficiency = this.findStateEfficiency(stateClass)
            const instance = new (stateClass as StateClass)()
            this.states.push(instance)
            this.applyStates(<any>this, instance)
            return instance
        }
        return null
    }

    /**
     * Remove a state to the player. Set the chance between 0 and 1 that the state can be removed
     * ```ts
     * import Paralyze from 'your-database/states/paralyze'
     * 
     * try { 
     *      player.removeState(Paralyze)
     * }
     * catch (err) {
     *      console.log(err)
     * }
     *  ```
     * 
     * @title Remove State
     * @method player.removeState(stateClass,chance=1)
     * @param {StateClass|string} stateClass class state or state id
     * @param {number} [chance] 1 by default
     * @throws {StateLog} removeFailed 
     * If the chance to remove the state has failed (defined with the `chance` param)
     *  ```
     * {
     *      id: REMOVE_STATE_FAILED,
     *      msg: '...'
     * }
     * ```
     * @throws {StateLog} notApplied 
     * If the status does not exist
     *  ```
     * {
     *      id: STATE_NOT_APPLIED,
     *      msg: '...'
     * }
     * ```
     * @returns {instance of StateClass}
     * @memberof StateManager
     */
    removeState(stateClass: StateClass | string, chance = 1) {
        const index = this.states.findIndex((state) => {
            if (isString(stateClass)) {
                return state.id == stateClass
            }
            return isInstanceOf(state, stateClass)
        })
        if (index != -1) {
            if (Math.random() > chance) {
                throw StateLog.removeFailed(stateClass)
            }
            this.states.splice(index, 1)
        }
        else {
            throw StateLog.notApplied(stateClass)
        }
    }

    private findStateEfficiency(stateClass) {
        return this.statesEfficiency.find(state => isInstanceOf(state.state, stateClass))
    }
}

applyMixins(StateManager, [ItemFixture])

export interface StateManager extends ItemFixture { 
    databaseById(stateClass: any),
}