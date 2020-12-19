import { RpgPlayer } from './Player';

export class StateManager {

    states: any[] = []

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
     * @param {StateClass} stateClass
     * @returns {instance of StateClass | null}
     * @memberof StateManager
     */
    getState(stateClass) {
        return this.states.find(({ state }) => state instanceof stateClass)
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
     * @param {StateClass} stateClass
     * @param {number} [chance] 1 by default
     * @throws {StateLog} todo 
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
    addState(stateClass, chance = 1): object | null {
        const state = this.getState(stateClass)
        if (!state) {
            if (Math.random() > chance) {
                throw '' // TODO
            }
            //const efficiency = this.findStateEfficiency(stateClass)
            const instance = new stateClass()
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
     * @param {StateClass} stateClass
     * @param {number} [chance] 1 by default
     * @throws {StateLog} todo 
     * If the chance to remove the state has failed (defined with the `chance` param)
     *  ```
     * {
     *      id: REMOVE_STATE_FAILED,
     *      msg: '...'
     * }
     * ```
     * @throws {StateLog} todo 
     * If the status does not exist
     *  ```
     * {
     *      id: STATE_NOT_APPLIED,
     *      msg: '...'
     * }
     * ```
     * @returns {instance of StateClass}
     * @memberof StateManager
     * @todo
     */
    removeState(stateClass, chance = 1) {
        const index = this.states.findIndex(state => state instanceof stateClass)
        if (index != -1) {
            if (Math.random() > chance) {
                throw '' // TODO
            }
            this.states.splice(index, 1)
        }
        else {
            throw '' // TODO
        }
    }
}