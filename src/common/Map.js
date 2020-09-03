import { DynamicObject, BaseTypes, Renderer } from 'lance-gg';

const buffer = new Map()

export default class RpgMap extends DynamicObject {

    static get netScheme() {
        return Object.assign({
            tilemap: { type: BaseTypes.TYPES.STRING } 
        }, super.netScheme);
    }

    static get buffer() {
        return buffer
    }

    onAddToWorld(gameEngine) {
        if (Renderer)
            Renderer.getInstance().addMap(this);
    }

    syncTo(other) {
        super.syncTo(other)
        this.tilemap = other.tilemap
    }
}
