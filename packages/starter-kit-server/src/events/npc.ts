import { RpgEvent, EventData, RpgPlayer, Move } from '@rpgjs/server'

export function NpcEvent(options: {
    text: string,
    name: string,
    graphic: string,
    moveRandom?: boolean,
    frequency?: number,
    speed?: number
}) {
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
            await player.showText(options.text, {
                talkWith: this
            })
        }
    }
    return NpcEvent
}