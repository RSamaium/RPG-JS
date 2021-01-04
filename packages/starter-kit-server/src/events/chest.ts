import { RpgEvent, EventData, RpgPlayer, EventMode, Direction } from '@rpgjs/server'

export function ChestEvent(options) {

    const { name, text, gain } = options

    @EventData({
        name,
        mode: EventMode.Scenario,
        hitbox: {
            width: 32,
            height: 16
        }
    })
    class _ChestEvent extends RpgEvent {
        onInit() {
            this.changeDirection(Direction.Up) 
            this.setGraphic('chest')
        }
        async onAction(player: RpgPlayer) {
            if (player.getVariable(name)) {
                return
            }
            if (player.getDirection() != Direction.Up) {
                return
            }
            await player.showText(text)
            player.addItem(gain.item)
            this.changeDirection(Direction.Down) 
            player.setVariable(name, true)
        }
    }
    return _ChestEvent
}