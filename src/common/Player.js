import { DynamicObject, Renderer, BaseTypes } from 'lance-gg';

const ACTIONS = { IDLE: 0, RUN: 1 }

export default class Player extends DynamicObject {

    static get netScheme() {
        return Object.assign({
            direction: { type: BaseTypes.TYPES.INT8 },
            action: { type: BaseTypes.TYPES.INT8 },
            progress: { type: BaseTypes.TYPES.INT8 }
        }, super.netScheme);
    }

    static get ACTIONS() {
        return ACTIONS;
    }

    get bending() {
        return {
            position: { percent: 0.8, min: 0.0, max: 4.0 },
            velocity: { percent: 0.0 }
        };
    }

    onAddToWorld(gameEngine) {
        if (Renderer)
            Renderer.getInstance().addPlayer(this)
    }

    onRemoveFromWorld(gameEngine) {
        if (Renderer)
            Renderer.getInstance().removePlayer(this)
    }

    syncTo(other) {
        super.syncTo(other)
        this.direction = other.direction
        this.progress = other.progress
    }

}