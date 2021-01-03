import { Log } from './log'

export class StateLog {
    static addFailed(stateClass) {
        return new Log('ADD_STATE_FAILED', `Adding the ${stateClass.name} state has failed`)
    }
    static removeFailed(stateClass) {
        return new Log('REMOVE_STATE_FAILED', `Removing the ${stateClass.name} state has failed`)
    }
    static notApplied(stateClass) {
        return new Log('STATE_NOT_APPLIED', `State ${stateClass.name} does not exist`)
    }
}