import { RpgMap } from '@rpgjs/server';
import { Speed } from '@rpgjs/server';
import { RpgPlayer, RpgPlayerHooks, Control, Components, RpgEvent, EventData } from '@rpgjs/server'
import Potion from './database/items/Potion';

const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
        player.name = 'YourName'
        player.setComponentsTop(Components.text('{position.x},{position.y}'))
    },
    onInput(player: RpgPlayer, { input }) {
        const map = player.getCurrentMap()
        if (input == 'action') {
            const gui = player.gui('test')
            gui.open({ gold: 10 })
            // const event = map?.createDynamicEvent({
            //     x: player.position.x + 5,
            //     y: player.position.y + 5,
            //     event: CharaEvent,
            // });
        }
        if (input == 'back') {
           player.callMainMenu()
        }
    },
    async onJoinMap(player: RpgPlayer) {
        player.gui('test').open();

        setTimeout(() => {
            player.addItem(Potion, 1);
        }, 5000);
    }
}

export default player