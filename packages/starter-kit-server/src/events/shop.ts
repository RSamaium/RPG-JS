import { RpgEvent, EventData, RpgPlayer } from '@rpgjs/server'
import { Key } from '../database/items/key';

@EventData({
    name: 'shop',
    hitbox: {
        width: 32,
        height: 16
    }
})
export class ShopEvent extends RpgEvent {
    onInit() {
        this.setGraphic('male4_1')
    }
    async onAction(player: RpgPlayer) {
        await player.callShop([ Key ])
    }
}