import { RpgEvent, EventData, RpgPlayer } from '@rpgjs/server'
import { Potion } from '../database/items/potion';

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
        player.gold += 10000
        await player.callShop([ Potion ])
    }
}