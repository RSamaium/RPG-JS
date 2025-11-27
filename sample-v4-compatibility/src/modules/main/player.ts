import { RpgPlayer } from '@rpgjs/server'

export default {
    onConnected(player: RpgPlayer) {
        console.log('Player connected')
    }
}
