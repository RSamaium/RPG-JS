import { DynamicObject } from 'lance-gg';

export default class Food extends DynamicObject {

    static get netScheme() {
        return Object.assign({
            // add serializable properties here
        }, super.netScheme);
    }

    syncTo(other) {
        super.syncTo(other);
    }

    constructor(gameEngine, options, props) {
        super(gameEngine, options, props);
        this.class = Food;
    };
}
