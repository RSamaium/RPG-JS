import { RpgEvent, EventData, RpgPlayer, Move } from '@rpgjs/server'

export function NpcEvent(options: {
    text: string | string[],
    name: string,
    graphic: string,
    moveRandom?: boolean,
    frequency?: number,
    speed?: number
}): object {
    @EventData({
        name: options.name, 
        hitbox: {
            width: 32,
            height: 16
        }
    })
    class NpcEvent extends RpgEvent {
        onInit() {
            this.speed = options.speed || 1
            this.frequency = options.frequency || 200
            this.setGraphic(options.graphic)
            if (options.moveRandom) this.infiniteMoveRoute([ Move.tileRandom() ])
        }
        async onAction(player: RpgPlayer) {
            let text = options.text
            if (typeof text == 'string') text = [text]
            for (let msg of text) {
                await player.showText(msg, {
                    talkWith: this
                })
            }
        }
    }
    return NpcEvent
}