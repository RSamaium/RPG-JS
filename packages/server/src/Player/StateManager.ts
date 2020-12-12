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

    getState(stateClass) {
        return this.states.find(({ state }) => state instanceof stateClass)
    }

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