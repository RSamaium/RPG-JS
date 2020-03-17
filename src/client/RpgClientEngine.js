import { ClientEngine, KeyboardControls } from 'lance-gg'
import Renderer from './Renderer'

export default class RpgClientEngine extends ClientEngine {

    constructor(gameEngine, options) {
        super(gameEngine, options, Renderer);
        this.controls = new KeyboardControls(this);
        this.controls.bindKey('up', 'up', { repeat: true } )
        this.controls.bindKey('down', 'down', { repeat: true } )
        this.controls.bindKey('left', 'left', { repeat: true } )
        this.controls.bindKey('right', 'right', { repeat: true } )
        this.controls.bindKey('space', 'space');
    }

    connect() {
        return super.connect().then(() => {
            this.socket.on('map', (data) => {
                this.renderer.addMap(data)
            });
        });
    }
}
