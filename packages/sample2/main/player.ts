import { RpgPlayerHooks, RpgPlayer } from '@rpgjs/server'

const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
       
    },
    onInput(player: RpgPlayer, { input }) {
        if (input == 'action') player.callMainMenu()
    }
}

export default player