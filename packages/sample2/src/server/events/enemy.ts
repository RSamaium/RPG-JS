import { RpgEvent, EventData, RpgPlayer, Move } from '@rpgjs/server'

@EventData({
    name: 'Enemy', 
    hitbox: {
        width: 16,
        height: 8
    }
})
export class MonsterEvent extends RpgEvent {
    onInit() {
        this.speed = 3
        this.setGraphic('monster') 
    }
}