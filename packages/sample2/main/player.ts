import { RpgMap } from '@rpgjs/server';
import { Speed } from '@rpgjs/server';
import { RpgPlayer, RpgPlayerHooks, Control, Components, RpgEvent, EventData } from '@rpgjs/server'
import Potion from './database/items/Potion';
import CharaEvent from './events/npc';

const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
        player.name = 'YourName'
        player.setComponentsTop(Components.text('{id}'))
    },
    onAuth: () => {},
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
    async onJoinMap(player: RpgPlayer, map: RpgMap) {
       player.save();
    }
}

export default player