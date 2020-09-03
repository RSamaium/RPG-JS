import { BaseTypes } from 'lance-gg';
import Player from './Player'

export default class Event extends Player {
    static get netScheme() {
        return super.netScheme
    }

    syncTo(other) {
        super.syncTo(other)
    }
}
