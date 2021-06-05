import { RpgPlayer, RpgMap, RpgPlayerHooks } from '@rpgjs/server'

export const player: RpgPlayerHooks = {
    onJoinMap(player: RpgPlayer, map: RpgMap) {
       
    },
    onInput(player: RpgPlayer, { input }) {
        if (input == 'back') {
            player.callMainMenu()
        }
    }
}