import { RpgEvent, EventData, RpgPlayer } from '@rpgjs/server'

@EventData({
    name: 'EV-2'
})
export default class CharaEvent extends RpgEvent {
    onInit() {
        this.setGraphic('male')
        this.setHitbox(32, 32)
    }
    async onAction(player: RpgPlayer) {
        await player.showText('Hello World')
    }
}