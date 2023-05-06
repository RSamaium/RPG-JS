import { RpgEvent, EventData, RpgPlayer } from '@rpgjs/server'

@EventData({
    name: 'EV-1'
})
export default class CharaEvent extends RpgEvent {
    onInit() {
        this.setGraphic('chara')
    }
    async onAction(player: RpgPlayer) {
        await player.showText('Hello World')
    }
}