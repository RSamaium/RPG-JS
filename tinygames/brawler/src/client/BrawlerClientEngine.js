import { ClientEngine, KeyboardControls } from 'lance-gg';
import BrawlerRenderer from '../client/BrawlerRenderer';

export default class BrawlerClientEngine extends ClientEngine {

    constructor(gameEngine, options) {
        super(gameEngine, options, BrawlerRenderer);

        // show try-again button
        gameEngine.on('objectDestroyed', (obj) => {
            if (obj.playerId === gameEngine.playerId) {
                document.body.classList.add('lostGame');
                document.querySelector('#tryAgain').disabled = false;
            }
        });

        // remove instructions
        setTimeout(() => {
            document.querySelector('#instructions').classList.add('hidden');
        }, 5000);

        // restart game
        document.querySelector('#tryAgain').addEventListener('click', () => {
            window.location.reload();
        });

        this.controls = new KeyboardControls(this);
        this.controls.bindKey('up', 'up', { repeat: true } );
        this.controls.bindKey('down', 'down', { repeat: true } );
        this.controls.bindKey('left', 'left', { repeat: true } );
        this.controls.bindKey('right', 'right', { repeat: true } );
        this.controls.bindKey('space', 'space');
    }


}
