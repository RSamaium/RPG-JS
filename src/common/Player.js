import { DynamicObject, Renderer, BaseTypes } from 'lance-gg';

const ACTIONS = { IDLE: 0, RUN: 1 }

export default class Player extends DynamicObject {

    static get netScheme() {
        return Object.assign({
            direction: { type: BaseTypes.TYPES.INT8 },
            action: { type: BaseTypes.TYPES.INT8 },
            progress: { type: BaseTypes.TYPES.INT8 },
            map: { type: BaseTypes.TYPES.STRING }
        }, super.netScheme);
    }

    static get ACTIONS() {
        return ACTIONS;
    }

    constructor(gameEngine, options, props) {
        super(gameEngine, options, props)
        this.map = ''
      }

    get bending() {
        return {
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
        this.map = other.map || ''
    }

}