import { RpgPlayer, RpgPlayerHooks } from "@rpgjs/server"

export const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
       console.log('play')
    }
} 