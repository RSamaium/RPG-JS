import { DynamicObject, BaseTypes, Renderer } from 'lance-gg';

export default class Map extends DynamicObject {

    static get netScheme() {
        return Object.assign({
            tilemap: { type: BaseTypes.TYPES.STRING } 
        }, super.netScheme);
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
