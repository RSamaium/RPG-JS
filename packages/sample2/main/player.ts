import { Speed } from '@rpgjs/server';
import { RpgPlayer, RpgPlayerHooks, Control, Components, RpgEvent, EventData } from '@rpgjs/server'

const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
        player.name = 'YourName'
        player.setComponentsTop(Components.text('{name}'))
    }
}

export default player