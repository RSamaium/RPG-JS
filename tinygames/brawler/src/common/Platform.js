import { DynamicObject, Renderer } from 'lance-gg';

export default class Platform extends DynamicObject {

    static get netScheme() {
        return super.netScheme;
    }

    onAddToWorld(gameEngine) {
        if (Renderer)
            Renderer.getInstance().addPlatform(this);
    }

    syncTo(other) {
        super.syncTo(other);
    }

    toString() {
        return `Platform::${super.toString()} Width=${this.width} Height=${this.height}`;
    }
}
