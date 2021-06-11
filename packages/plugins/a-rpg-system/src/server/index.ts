import { RpgPlayer, RpgMap, HookServer, RpgEvent } from '@rpgjs/server'

export default function({ RpgPlugin }) {
    RpgPlugin.on(HookServer.PlayerJoinMap, (player: RpgPlayer, map: RpgMap) => {
        Object.values(map.events).forEach((event: RpgEvent) => {
            const { type } = event.properties
            if (type == 'enemy') {
                event.setVision({
                    type: 'box',
                    width: 100,
                    height: 100
                })
            }
        })
    })

    RpgPlugin.on(HookServer.PlayerInVision, (player: RpgEvent, other: RpgPlayer) => {
        const { type } = player.properties
        if (type == 'enemy') {
            player.setBehavior(other)
        }
    })

    RpgPlugin.on(HookServer.PlayerOutVision, (player: RpgEvent, other: RpgPlayer) => {
        const { type } = player.properties
        if (type == 'enemy') {
            //player.stopBehavior()
        }
    })
}