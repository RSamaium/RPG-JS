import { RpgMap } from '@rpgjs/server';
import { Speed } from '@rpgjs/server';
import { RpgPlayer, RpgPlayerHooks, Control, Components, RpgEvent, EventData } from '@rpgjs/server'
import Potion from './database/items/Potion';
import CharaEvent from './events/npc';

const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
        player.name = 'YourName'
        player.setComponentsTop(Components.text('{name}'))
    },
    onInput(player: RpgPlayer, { input }) {
        const map = player.getCurrentMap()
        if (input == 'action') {
            
            // const event = map?.createDynamicEvent({
            //     x: player.position.x + 5,
            //     y: player.position.y + 5,
            //     event: CharaEvent,
            // });
        }
        if (input == 'back') {
            const event = map?.getEventByName('EV-1') as any
            if (event) event.hp -= 200
        }
    },
    async onJoinMap(player: RpgPlayer, map: RpgMap) {
       player.save();
    }
}

export default player