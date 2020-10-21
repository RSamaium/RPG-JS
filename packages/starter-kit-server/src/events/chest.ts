import { RpgEvent, EventData, RpgPlayer, Query } from '@rpgjs/server'
import { Monster } from '../database/enemies/monster'

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
        this.setGraphic('hero')
    }

    onChanges(player) {
        if (player.getVariable('A')) {
            return
        }
    }

    async onAction(player: RpgPlayer) {
       player.startBattle([
            { enemy: Monster, level: 1 },
            { enemy: Monster, level: 1 }
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