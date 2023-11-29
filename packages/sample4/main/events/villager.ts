import { RpgEvent, EventData, RpgPlayer, Move, Components } from '@rpgjs/server'

@EventData({
    name: 'EV-1', 
    hitbox: {
        width: 32,
        height: 16
    }
})
export default class VillagerEvent extends RpgEvent {
    onInit() {
        this.setGraphic('female')

        this.speed = 1.2;
        // this.infiniteMoveRoute([
        //     Move.tileRandom()
        // ])
        this.setComponentsTop(Components.hpBar())
    }
    async onAction(player: RpgPlayer) {
        this.getCurrentMap()?.createShape({
            x: this.position.x,
            y: this.position.y,
            name: 'rectangle',
            width: 32,
            height: 16,
            properties: {
                color: '#ff0000'
            }
        });
    }
}
