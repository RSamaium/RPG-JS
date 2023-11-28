import { EventData, RpgEvent } from '@rpgjs/server';

// @ts-ignore
@EventData({
    name: 'arrow-bullet',
    hitbox: {
        width: 31,
        height: 5
    }
})
export default class ArrowBullet extends RpgEvent {
    onInit() {
        this.speed = 5;
        this.setGraphic('arrow');
        this.through = true;
        this.throughOtherPlayer = true;
    }
}
