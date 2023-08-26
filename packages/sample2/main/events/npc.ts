import { RpgEvent, EventData, RpgPlayer, EventMode } from '@rpgjs/server'
 
@EventData({
    name: 'EV-1'
})
export default class CharaEvent extends RpgEvent {
    onInit() {
        this.setGraphic('male')
        this.setHitbox(16, 16)
    }
    async onAction(player: RpgPlayer) {
    
    }
    onDead() {
        this.showAnimation('animation', 'default')
        this.remove()
    }
}