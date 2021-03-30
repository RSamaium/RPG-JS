import { RpgEvent, EventData, RpgPlayer, Move } from '@rpgjs/server'

@EventData({
    name: 'Enemy', 
    hitbox: {
        width: 32,
        height: 16
    }
})
export class MonsterEvent extends RpgEvent {
    onInit() {
        this.speed = 3
        this.frequency = 100
        this.setGraphic('monster') 
        this.infiniteMoveRoute([ Move.tileRandom() ])
    }
}