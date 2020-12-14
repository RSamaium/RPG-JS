import { RpgEvent, EventData, RpgPlayer, Query, Move } from '@rpgjs/server'
import { Monster } from '../database/enemies/monster'
import { Potion } from '../database/items/potion';

@EventData({
    name: 'EV-1',
    syncAll: true,
    width: 32,
    height: 32,
    hitbox: {
        width: 32,
        height: 16
    }
})
class _ChestEvent extends RpgEvent {

    onInit() {
        this.speed = 3
        this.setGraphic('hero')
    }

    onChanges(player) {
        if (player.getVariable('A')) {
            return
        }
    }

    async onAction(player: RpgPlayer) {
        /*await player.showText('Hey !')
        player.addItem(Potion)*/
        await this.moveRoutes([
            Move.tileRandom(10)
        ])
    }

    onPlayerTouch() {
        
    }

    onEventTouch() {

    }

    onDestroy() {

    }
}

export function ChestEvent() {
    return _ChestEvent
}