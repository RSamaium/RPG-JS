import { RpgEvent, EventData, RpgPlayer, EventMode, Direction } from '@rpgjs/server'

export function ChestEvent(options): object {

    const { name, text, gain } = options

    @EventData({
        name,
        mode: EventMode.Scenario,
        hitbox: {
            width: 32,
            height: 16
        }
    })
    class ChestEventClass extends RpgEvent {
        onInit(player: RpgPlayer) {
            this.resfresh(player)
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
            player.setVariable(name, true)
            this.resfresh(player)
        }
        private resfresh(player) {
            if (player.getVariable(name)) {
                this.changeDirection(Direction.Down)
            }
            else {
                this.changeDirection(Direction.Up) 
            }
        }
    }
    return ChestEventClass
}