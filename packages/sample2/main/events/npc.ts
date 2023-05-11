import { RpgEvent, EventData, RpgPlayer } from '@rpgjs/server'
import { EmotionBubble } from '@rpgjs/plugin-emotion-bubbles'

@EventData({
    name: 'EV-1'
})
export default class CharaEvent extends RpgEvent {
    onInit() {
        this.setGraphic('male')
        this.setHitbox(32, 32)
    }
    async onAction(player: RpgPlayer) {
        await player.showEmotionBubble(EmotionBubble.Like)
    }
}