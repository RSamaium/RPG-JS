import { RpgPlayerHooks, RpgPlayer } from '@rpgjs/server'

const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
       player.addItem('potion', 1)
    }
}

export default player