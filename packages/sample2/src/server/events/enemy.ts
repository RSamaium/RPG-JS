import { RpgEvent, EventData, RpgPlayer, Move } from '@rpgjs/server'

@EventData({
    name: 'Enemy', 
    hitbox: {
        width: 8,
        height: 8 
    }
})
export class MonsterEvent extends RpgEvent {
    onInit() {
        this.speed = 1
        this.setGraphic('monster') 
    }
}