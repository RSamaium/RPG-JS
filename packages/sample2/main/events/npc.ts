import { RpgEvent, EventData, RpgPlayer, EventMode, Components } from '@rpgjs/server'
 
@EventData({
    name: 'EV-1'
})
export default class CharaEvent extends RpgEvent {
    onInit() {
        this.setGraphic('male')
        this.setHitbox(16, 16)
        this.setComponentsTop(Components.hpBar())
    }
    async onAction(player: RpgPlayer) {
    
    }
}