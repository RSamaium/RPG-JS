import { RpgPlayer, RpgPlayerHooks } from '@rpgjs/server'

export const player: RpgPlayerHooks = {
    onConnected(player: RpgPlayer) {
       player._socket.on('save', (index) => {
           const json = player.save()
           player.emit('saved', {
               slot: index,
               data: json,
               date: Date.now()
           })
       })
    }
}