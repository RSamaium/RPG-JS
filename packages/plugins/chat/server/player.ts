import { RpgPlayer, RpgPlayerHooks, RpgMap, RpgWorld } from '@rpgjs/server'

function sendMessage(obj: { message: string, map: RpgMap, player?: RpgPlayer, type?: string }) {
    const { message, map, player, type } = obj
    RpgWorld.getPlayersOfMap(map.id).forEach(p => {
        p.emit('chat-message', {
            message,
            sender: player.id,
            date: Date.now(),
            type: type || 'player'
        })
    })
}


export const player: RpgPlayerHooks = {
    onJoinMap(player: RpgPlayer, map: RpgMap) {
        sendMessage({
            message: `${player.name} join this map`, 
            map, 
            player,
            type: 'info'
        })
        player.on('chat-message', (message) => {
            sendMessage({
                message: `${player.name}: ${message}`, 
                map, 
                player
            })
        })
    },
    onLeaveMap(player: RpgPlayer, map: RpgMap) {
        sendMessage({
            message: `${player.name} left this map`, 
            map, 
            player,
            type: 'info'
        })
    }
}