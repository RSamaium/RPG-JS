import { RpgPlayerHooks, RpgPlayer } from '@rpgjs/server'

const player: RpgPlayerHooks = {
   onJoinMap(player: RpgPlayer) {
     player.showText('Hello world')
   }
}

export default player 