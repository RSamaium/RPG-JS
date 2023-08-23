import { RpgEvent, EventData, RpgPlayer, EventMode } from '@rpgjs/server'
 
@EventData({
    name: 'EV-1',
    //mode: EventMode.Scenario
})
export default class CharaEvent extends RpgEvent {
    onInit() {
        this.setGraphic('male')
        this.setHitbox(32, 32)
    }
    async onAction(player: RpgPlayer) {
    
    }
    onDead() {
        this.showAnimation('animation', 'default', true)
        this.getCurrentMap()?.removeEvent(this.id)
      
       
    }
}