import { RpgPlayer, RpgMap, HookServer, RpgEvent } from '@rpgjs/server'

export default function({ RpgPlugin }) {
    RpgPlugin.on(HookServer.PlayerJoinMap, (player: RpgPlayer, map: RpgMap) => {
        Object.values(map.events).forEach((event: RpgEvent) => {
            const { type } = event.properties
            if (type == 'enemy') {
                event.setBehavior(player)
            }
        })
    })
}